import crypto from 'node:crypto';
import {
  makeWASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  delay,
} from '@whiskeysockets/baileys';
import { logger, baileysLogger } from './log.js';
import { config } from './config.js';
import { encodeSession, memoryAuthState } from './session.js';

/**
 * Pairing engine — one request in, one SESSION_ID out.
 *
 * Nothing touches the disk: each job owns an in-memory auth state, so there is
 * no temp directory to clean up and no half-written creds.json to poll for.
 *
 * The code is only requested once WhatsApp answers the handshake (the first
 * `qr` / `connecting` event); asking earlier is the usual reason a code never
 * links. After the phone accepts, WhatsApp closes the socket with 515 and asks
 * for a fresh one — that reconnect is where `creds.me` finally exists, so the
 * session is exported there and nowhere else.
 */

const LINK_TIMEOUT_MS = Number(process.env.LINK_TIMEOUT_MS || 4 * 60 * 1000);
const CODE_TTL_MS = 60_000; // WhatsApp codes are short-lived; ours says so up front
const MAX_ACTIVE = Number(process.env.MAX_ACTIVE || 3);
const SESSION_PREFIX = process.env.SESSION_PREFIX || config.botName.replace(/[^A-Za-z0-9-]/g, '') || 'SESSION';
const FAKE = process.env.PAIR_FAKE === '1';
// A link you are about to delete should be good for exactly one pairing.
const ONCE = process.env.PAIR_ONCE === '1';
let onceUsed = false;

const jobs = new Map();

export class PairError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

/** " +234 801 234 5678 " → "2348012345678"; a leading 0 is a real mistake to name. */
export function normalizeNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) throw new PairError('Enter your WhatsApp number.');
  if (digits.length < 8) throw new PairError('That number is too short — include the country code.');
  if (digits.length > 15) throw new PairError('That number is too long — drop the + and any spaces.');
  if (digits.startsWith('0')) throw new PairError(`Drop the leading 0 and use the country code instead — e.g. 234${digits.slice(1)}.`);
  return digits;
}

const ACTIVE = ['starting', 'code', 'linking'];

const publicJob = (job) => ({
  id: job.id,
  state: job.state,
  code: job.code,
  session: job.session,
  error: job.error,
  createdAt: job.createdAt,
  expiresAt: job.expiresAt,
  codeExpiresAt: job.codeExpiresAt,
  expiresIn: job.expiresAt ? Math.max(0, Math.round((job.expiresAt - Date.now()) / 1000)) : null,
  codeExpiresIn: job.codeExpiresAt ? Math.max(0, Math.round((job.codeExpiresAt - Date.now()) / 1000)) : null,
});

export function listJobs() {
  return [...jobs.values()].map((j) => ({
    ...publicJob(j),
    session: j.session ? '(held)' : null,
    number: `${j.number.slice(0, 4)}•••${j.number.slice(-2)}`,
  }));
}

export function stats() {
  const all = [...jobs.values()];
  return {
    active: all.filter((j) => ACTIVE.includes(j.state)).length,
    linked: all.filter((j) => j.state === 'ready' || j.state === 'done').length,
    max: MAX_ACTIVE,
  };
}

function teardown(job) {
  try { job.sock?.ev?.removeAllListeners?.('connection.update'); } catch { /* socket gone */ }
  try { job.sock?.end?.(undefined); } catch { /* already closed */ }
  clearTimeout(job.timer);
  clearTimeout(job.codeTimer);
}

function fail(job, message) {
  if (job.state === 'ready') return;
  job.state = 'error';
  job.error = message;
  teardown(job);
}

/** The moment the link is complete: creds.me exists, so the string is final. */
function finish(job) {
  try {
    job.session = encodeSession(job.auth.creds, SESSION_PREFIX);
  } catch (err) {
    logger.error({ err }, 'could not encode session');
    return fail(job, 'Pairing finished but the session could not be written. Try again.');
  }
  job.state = 'ready';
  job.expiresAt = Date.now() + 10 * 60 * 1000;
  if (ONCE) onceUsed = true;
  teardown(job);
  logger.info(`paired ${job.number.slice(0, 4)}••• (job ${job.id})`);
  announce(job).catch(() => {});
}

/** DM the session to the account itself, so a shared screen is not the only copy. */
async function announce(job) {
  const self = job.auth?.creds?.me?.id;
  if (!self || !job.sock) return;
  await job.sock.sendMessage(self, {
    text:
      `🔑 *${config.botName} — linked*\n\n` +
      'Save this as *SESSION_ID* wherever the bot runs.\n' +
      'Anyone holding it controls this WhatsApp account.\n\n' +
      job.session,
  });
  job.dmed = true;
}

function issueCode(job) {
  if (job.codeTimer) clearTimeout(job.codeTimer);
  job.codeExpiresAt = Date.now() + CODE_TTL_MS;
  job.codeTimer = setTimeout(() => {
    if (job.state === 'code') { job.code = null; job.codeExpired = true; }
  }, CODE_TTL_MS).unref?.();
}

async function requestCode(job) {
  if (job.codeRequested || job.state === 'error' || job.state === 'ready') return;
  job.codeRequested = true;
  try {
    job.code = await job.sock.requestPairingCode(job.number);
    job.state = 'code';
    issueCode(job);
    logger.info(`pair code issued for ${job.number.slice(0, 4)}••• (job ${job.id})`);
  } catch (err) {
    const status = err?.output?.statusCode;
    logger.warn(`requestPairingCode failed · ${status ?? 'unknown'} · job ${job.id}`);
    job.codeRequested = false;
    // 428 = WhatsApp closed the socket the moment a code was asked for. In
    // practice that is either a number that is not on WhatsApp, or a rate limit.
    const message = status === 428
      ? 'WhatsApp closed the connection for that number. Check it is on WhatsApp, then wait a minute and try again.'
      : status === 429
        ? 'WhatsApp is rate-limiting code requests right now. Wait a few minutes.'
        : 'WhatsApp would not issue a code for that number. Check it, or wait a few minutes and try again.';
    fail(job, message);
  }
}

function connect(job) {
  const auth = memoryAuthState();
  job.auth = auth;

  const build = async () => {
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
    const sock = makeWASocket({
      version,
      auth: { creds: auth.creds, keys: makeCacheableSignalKeyStore(auth.state.keys, baileysLogger) },
      logger: baileysLogger,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      connectTimeoutMs: 30_000,
      keepAliveIntervalMs: 20_000,
      getMessage: async () => ({ conversation: '' }),
    });
    job.sock = sock;
    sock.ev.on('creds.update', auth.saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, qr, lastDisconnect } = update;

      // handshake answered → now a code can actually be issued
      if ((qr || connection === 'connecting') && !auth.creds.registered) requestCode(job);

      if (connection === 'open') {
        job.state = 'linking';
        finish(job);
        return;
      }

      if (connection !== 'close') return;

      const status = lastDisconnect?.error?.output?.statusCode;
      logger.warn(`pair socket closed · ${status ?? 'unknown'} · job ${job.id}`);

      // 515 (restartRequired): phone accepted, WhatsApp wants a fresh socket.
      // This is where creds.me appears, so reconnect instead of failing.
      if (status === DisconnectReason.restartRequired || status === 515 || status === 428) {
        await delay(600);
        job.state = 'linking';
        build().catch((err) => fail(job, err.message));
        return;
      }
      if (status === DisconnectReason.loggedOut || status === 401) {
        return fail(job, 'That device rejected the link. Try again.');
      }
      if (status === DisconnectReason.badSession || status === 411) {
        return fail(job, 'This number keeps dropping the handshake. Update the bot and try again.');
      }
      if (ACTIVE.includes(job.state)) {
        fail(job, lastDisconnect?.error?.message?.slice(0, 160) || 'Connection dropped before the link finished.');
      }
    });
  };

  return build();
}

export async function startPairing(rawNumber) {
  if (ONCE && onceUsed) {
    throw new PairError('This pairing link is single-use and has already been used.', 403);
  }
  const number = normalizeNumber(rawNumber);

  // single-flight: a second tap gets the same job instead of a second code
  for (const job of jobs.values()) {
    if (job.number === number && ACTIVE.includes(job.state)) return publicJob(job);
  }
  if (stats().active >= MAX_ACTIVE) {
    throw new PairError('The pairing service is busy — try again in a few minutes.', 429);
  }

  const job = {
    id: crypto.randomBytes(9).toString('hex'),
    number,
    state: 'starting',
    code: null,
    session: null,
    error: null,
    createdAt: Date.now(),
    expiresAt: null,
    codeExpiresAt: null,
    codeRequested: false,
    codeExpired: false,
    dmed: false,
    sock: null,
    auth: null,
  };
  jobs.set(job.id, job);

  job.timer = setTimeout(() => {
    if (ACTIVE.includes(job.state)) fail(job, 'Timed out — no phone was linked.');
    if (job.state === 'ready') { job.session = null; job.state = 'done'; }
    jobs.delete(job.id);
  }, LINK_TIMEOUT_MS + 30_000).unref?.();

  if (FAKE) return fakePair(job);

  connect(job).catch((err) => {
    logger.error({ err }, 'pairing connect failed');
    fail(job, 'Could not reach WhatsApp — try again.');
  });

  return publicJob(job);
}

/**
 * Test mode (`PAIR_FAKE=1`). It walks the same states with the same shapes and
 * produces a session string encoded by the very same function, so the HTTP
 * contract, the UI and the bot-side parser can all be tested without a phone.
 * It is never enabled unless the env var is set explicitly.
 */
async function fakePair(job) {
  await delay(120);
  job.code = `FAKE-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  job.state = 'code';
  issueCode(job);
  setTimeout(() => {
    const auth = memoryAuthState();
    auth.creds.me = { id: `${job.number}:3@s.whatsapp.net`, name: 'Test Device', lid: `${job.number}@lid` };
    auth.creds.registered = true;
    auth.creds.account = { details: Buffer.from('test').toString('base64'), accountSignatureKey: 'x', accountSignature: 'x', deviceSignature: 'x' };
    job.auth = auth;
    job.state = 'linking';
    finish(job);
  }, 400).unref?.();
  return publicJob(job);
}

/** Re-issue a code for a live job (codes expire after a minute). */
export async function refreshCode(id) {
  const job = jobs.get(id);
  if (!job) throw new PairError('That pairing session expired. Start over.', 404);
  if (job.state === 'ready') throw new PairError('This number is already linked.', 409);
  if (job.state === 'linking') throw new PairError('The phone already accepted — finishing up.', 409);
  if (FAKE) { job.code = `FAKE-${crypto.randomBytes(2).toString('hex').toUpperCase()}`; job.state = 'code'; issueCode(job); return publicJob(job); }
  job.codeRequested = false;
  await requestCode(job);
  return publicJob(job);
}

export function getJob(id, { consume = false } = {}) {
  const job = jobs.get(id);
  if (!job) return null;
  const view = publicJob(job);
  if (consume && job.session && job.state === 'ready') {
    job.session = null;
    job.state = 'done';
    teardown(job);
    jobs.delete(id);
  }
  return view;
}

export async function cancelPairing(id) {
  const job = jobs.get(id);
  if (!job) return false;
  jobs.delete(id);
  teardown(job);
  return true;
}

export async function sweep() {
  for (const [id, job] of jobs) {
    if (Date.now() - job.createdAt > LINK_TIMEOUT_MS + 10 * 60 * 1000) {
      jobs.delete(id);
      teardown(job);
    }
  }
}

export const stats2 = () => ({ once: ONCE, used: onceUsed });

export const __test = { jobs, CODE_TTL_MS, ACTIVE, resetOnce: () => { onceUsed = false; } };
