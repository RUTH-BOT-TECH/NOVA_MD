import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  delay,
} from '@whiskeysockets/baileys';
import { logger, baileysLogger } from '../../src/lib/logger.js';
import { config } from '../../src/config.js';

/**
 * Pairing engine.
 *
 * One HTTP request → one isolated temp auth dir → one pairing code →
 * wait for `connection: open` → export creds.json as a base64 SESSION_ID →
 * delete the temp dir. Nothing is written to disk permanently.
 */

const TMP_DIR = path.resolve(process.env.WEB_SESSION_DIR || 'web/tmp');
const LINK_TIMEOUT_MS = Number(process.env.LINK_TIMEOUT_MS || 4 * 60 * 1000); // 4 min
const MAX_ACTIVE = Number(process.env.MAX_ACTIVE || 3);
const SESSION_PREFIX = process.env.SESSION_PREFIX || config.botName.replace(/[^A-Za-z0-9-]/g, '') || 'SESSION';

const jobs = new Map(); // id -> job

export class PairError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

/** Accepts "+234 801 234 5678", "2348012345678", "08012345678"→ error. */
export function normalizeNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) throw new PairError('Enter your WhatsApp number.');
  if (digits.length < 8 || digits.length > 15) throw new PairError('That number looks too short or too long. Include the country code.');
  if (digits.startsWith('0')) throw new PairError('Drop the leading 0 and use the country code instead — e.g. 234' + digits.slice(1) + '.');
  return digits;
}

const publicJob = (job) => ({
  id: job.id,
  state: job.state,
  code: job.code,
  session: job.session,
  error: job.error,
  expiresAt: job.expiresAt,
  createdAt: job.createdAt,
});

export function listJobs() {
  return [...jobs.values()].map((j) => ({ ...publicJob(j), session: j.session ? '(held)' : null, number: j.number.slice(0, 5) + '•••' }));
}

export function stats() {
  const all = [...jobs.values()];
  return {
    active: all.filter((j) => ['starting', 'code', 'linking'].includes(j.state)).length,
    linked: all.filter((j) => j.state === 'linked').length,
    max: MAX_ACTIVE,
  };
}

async function cleanup(job, { keepSession = false } = {}) {
  try { job.sock?.ev?.removeAllListeners?.('connection.update'); } catch {}
  try { job.sock?.end?.(undefined); } catch {}
  if (!keepSession) {
    await fs.rm(job.dir, { recursive: true, force: true }).catch(() => {});
  }
  clearTimeout(job.timer);
}

function fail(job, message) {
  job.state = 'error';
  job.error = message;
  cleanup(job).catch(() => {});
}

async function exportSession(job) {
  // creds.json is written by useMultiFileAuthState as BufferJSON-encoded JSON
  const credsPath = path.join(job.dir, 'creds.json');
  let raw = null;
  for (let i = 0; i < 10 && !raw; i++) {
    raw = await fs.readFile(credsPath, 'utf8').catch(() => null);
    if (!raw) await delay(400);
  }
  if (!raw) throw new Error('creds.json never appeared — pairing did not finish cleanly.');
  const parsed = JSON.parse(raw);
  if (!parsed?.me?.id) throw new Error('Session is incomplete (no device id). Try again.');
  return `${SESSION_PREFIX}~${Buffer.from(raw).toString('base64')}`;
}

async function deliver(job) {
  // DM the session to the account itself ("Message yourself") — the page is
  // only a convenience copy, so a shared screen isn't a credential leak.
  try {
    const self = job.sock.user?.id;
    if (self) {
      await job.sock.sendMessage(self, {
        text:
          `🔑 *${config.botName} — your session is ready*\n\n` +
          `Copy the line below and save it as *SESSION_ID* in your host's env vars.\n` +
          `Treat it like a password — anyone holding it controls this WhatsApp account.\n\n` +
          `${job.session}`,
      });
      job.delivered = true;
    }
  } catch (err) {
    logger.warn({ err }, 'could not DM session to self');
  }
}

async function connect(job) {
  const { state, saveCreds } = await useMultiFileAuthState(job.dir);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    logger: baileysLogger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    getMessage: async () => ({}),
  });

  job.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  let codeRequested = false;
  const requestCode = async () => {
    if (codeRequested || job.state === 'error') return;
    codeRequested = true;
    try {
      // digits only, country code, no "+" — see baileys.wiki/authentication/pairing-code
      job.code = await sock.requestPairingCode(job.number);
      job.state = 'code';
      job.expiresAt = Date.now() + LINK_TIMEOUT_MS;
      logger.info(`pair code issued for ${job.number.slice(0, 5)}••• (job ${job.id})`);
    } catch (err) {
      logger.error({ err }, 'requestPairingCode failed');
      fail(job, 'WhatsApp refused to issue a code — check the number, or wait a few minutes and retry.');
    }
  };

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr, lastDisconnect } = update;

    // The socket is only ready once WhatsApp answers the handshake, which is
    // exactly when the first qr/connecting event lands. Requesting earlier
    // is the #1 reason codes never link.
    if ((qr || connection === 'connecting') && !state.creds.registered) requestCode();

    if (connection === 'open') {
      job.state = 'linked';
      try {
        job.session = await exportSession(job);
        await deliver(job);
        job.state = 'ready';
      } catch (err) {
        logger.error({ err }, 'session export failed');
        fail(job, err.message);
        return;
      }
      // keep the temp dir until the user has fetched it, then clean up
      clearTimeout(job.timer);
      job.timer = setTimeout(() => cleanup(job).catch(() => {}), 10 * 60 * 1000);
      return;
    }

    if (connection === 'close') {
      const status = lastDisconnect?.error?.output?.statusCode;
      logger.warn(`pair socket closed · ${status} · job ${job.id}`);

      if (status === DisconnectReason.restartRequired || status === 515 || status === 428) {
        // pairing accepted — WhatsApp asks for a fresh socket to finish the link
        await delay(600);
        job.state = 'linking';
        connect(job).catch((err) => fail(job, err.message));
        return;
      }
      if (status === DisconnectReason.loggedOut || status === 401) {
        return fail(job, 'Pairing was rejected on the device. Try again.');
      }
      if (job.state !== 'error' && job.state !== 'ready') {
        fail(job, lastDisconnect?.error?.message || 'Connection dropped before pairing finished.');
      }
    }
  });
}

export async function startPairing(rawNumber) {
  const number = normalizeNumber(rawNumber);

  // single-flight: reuse an in-progress job for the same number
  for (const job of jobs.values()) {
    if (job.number === number && ['starting', 'code', 'linking'].includes(job.state)) return publicJob(job);
  }
  if (stats().active >= MAX_ACTIVE) {
    throw new PairError('The pairing service is busy right now — try again in a few minutes.', 429);
  }

  const id = crypto.randomBytes(9).toString('hex');
  const job = {
    id, number, state: 'starting', code: null, session: null, error: null,
    dir: path.join(TMP_DIR, id), sock: null, createdAt: Date.now(), expiresAt: null,
  };
  jobs.set(id, job);

  job.timer = setTimeout(() => {
    if (['starting', 'code', 'linking'].includes(job.state)) fail(job, 'Timed out — no device was linked.');
    jobs.delete(id);
  }, LINK_TIMEOUT_MS + 30_000);

  connect(job).catch((err) => {
    logger.error({ err }, 'pairing connect failed');
    fail(job, 'Could not reach WhatsApp. Try again.');
  });

  return publicJob(job);
}

export function getJob(id, { consume = false } = {}) {
  const job = jobs.get(id);
  if (!job) return null;
  const view = publicJob(job);
  if (consume && job.session && job.state === 'ready') {
    // one-time read; the DM copy is the durable one
    job.session = null;
    job.state = 'done';
    jobs.delete(id);
    cleanup(job).catch(() => {});
  }
  return view;
}

export async function cancelPairing(id) {
  const job = jobs.get(id);
  if (!job) return false;
  jobs.delete(id);
  await cleanup(job);
  return true;
}

export async function sweep() {
  for (const [id, job] of jobs) {
    if (Date.now() - job.createdAt > LINK_TIMEOUT_MS + 10 * 60 * 1000) {
      jobs.delete(id);
      await cleanup(job);
    }
  }
}
