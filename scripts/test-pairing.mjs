/**
 * Pairing-site tests.
 *
 * The server is booted the way it boots in production, with one difference:
 * PAIR_FAKE=1 swaps the WhatsApp socket for a stub that walks the same states
 * and encodes the session with the same function. Everything else — validation,
 * rate limiting, single-flight, the one-time consume, the UI wiring — is real.
 *
 * The important assertion is the last group: the string the site hands out is
 * fed straight into the bot's own session parser (src/lib/auth.js).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { encodeSession, decodeSession, memoryAuthState } from '../web/lib/session.js';
import { useSessionStringAuthState } from '../src/lib/auth.js';

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label} ${detail}`); }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── unit: number normalisation ─────────────────────────────────────── */
const { normalizeNumber, PairError } = await import('../web/lib/pairer.js');
const rejects = (input, why) => {
  try { normalizeNumber(input); return false; } catch (err) { return err instanceof PairError && (!why || why.test(err.message)); }
};
ok('normalizeNumber accepts a plain international number', normalizeNumber('2348012345678') === '2348012345678');
ok('normalizeNumber strips +, spaces and dashes', normalizeNumber('+234 801 234-5678') === '2348012345678');
ok('normalizeNumber names a leading 0', rejects('08012345678', /leading 0/));
ok('normalizeNumber refuses an empty field', rejects('', /Enter your WhatsApp number/));
ok('normalizeNumber refuses a stub number', rejects('123', /too short/));
ok('normalizeNumber refuses an over-long number', rejects('1'.repeat(17), /too long/));

/* ── unit: in-memory auth state ─────────────────────────────────────── */
const auth = memoryAuthState();
auth.state.keys.set({ 'pre-key': { 1: { public: 'a', private: 'b' } }, session: { x: { y: 1 } } });
const readBack = auth.state.keys.get('pre-key', ['1']);
ok('memory key store writes and reads back', readBack['1']?.public === 'a', JSON.stringify(readBack));
ok('memory key store reports its size', auth.keyCount() === 2, String(auth.keyCount()));
ok('fresh creds are not registered yet', auth.creds.registered === false);

/* ── unit: session encode/decode ────────────────────────────────────── */
const fake = memoryAuthState();
fake.creds.me = { id: '2348012345678:7@s.whatsapp.net', name: 'NOVA test' };
fake.creds.registered = true;
const encoded = encodeSession(fake.creds, 'NOVA-MD');
ok('session string carries the bot prefix', encoded.startsWith('NOVA-MD~'), encoded.slice(0, 20));
ok('session string decodes with the right device id', decodeSession(encoded).me.id === '2348012345678:7@s.whatsapp.net');
ok('session decoder survives a JSON data-url prefix', decodeSession('data:application/json;base64,' + encoded.split('~')[1]).me.id.endsWith('@s.whatsapp.net'));
ok('session decoder rejects junk', (() => { try { decodeSession('not-a-session'); return false; } catch { return true; } })());

/* ── the bot must be able to load what the site produced ────────────── */
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nova-session-'));
const restored = await useSessionStringAuthState(encoded, dir, { info() {} });
ok("bot's session loader restores the site's string", restored.state.creds.me.id === fake.creds.me.id, JSON.stringify(restored.state.creds.me));
const written = JSON.parse(await fs.readFile(path.join(dir, 'creds.json'), 'utf8'));
ok('restored creds land on disk for the bot', written.me.id === fake.creds.me.id);
await fs.rm(dir, { recursive: true, force: true });

/* ── live server ────────────────────────────────────────────────────── */
const PORT = 3400 + Math.floor(Math.random() * 200);
const child = spawn(process.execPath, ['web/server.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PAIR_FAKE: '1', PORT: String(PORT), PER_IP: '50', LOG_LEVEL: 'error' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (d) => { serverLog += d; });
child.stderr.on('data', (d) => { serverLog += d; });

const base = `http://127.0.0.1:${PORT}`;
let up = false;
for (let i = 0; i < 60 && !up; i++) {
  await sleep(200);
  up = await fetch(`${base}/health`).then((r) => r.ok).catch(() => false);
}
ok('pairing server boots and answers /health', up, serverLog.slice(-200));

try {
  const health = await (await fetch(`${base}/health`)).json();
  ok('health reports test mode honestly', health.ok === true && health.mode === 'test', JSON.stringify(health));

  const cfg = await (await fetch(`${base}/api/config`)).json();
  ok('/api/config exposes the bot brand', Boolean(cfg.botName) && Boolean(cfg.sessionPrefix), JSON.stringify(cfg).slice(0, 80));

  const page = await fetch(`${base}/`).then((r) => r.text());
  ok('the pairing page is served', /SESSION_ID/.test(page) && /Get code/.test(page));
  ok('the page has the countdown and re-issue hook', /id="tick"/.test(page) && /id="recode"/.test(page) && /\/code/.test(page));

  const bad = await fetch(`${base}/api/pair`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ number: '08012345678' }) });
  const badBody = await bad.json();
  ok('a leading 0 is refused with a helpful message', bad.status === 400 && /country code/i.test(badBody.error), JSON.stringify(badBody));

  const created = await fetch(`${base}/api/pair`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ number: '+234 801 234 5678' }) });
  const job0 = await created.json();
  ok('a valid number creates a job', created.status === 200 && Boolean(job0.id), JSON.stringify(job0));

  const again = await (await fetch(`${base}/api/pair`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ number: '2348012345678' }) })).json();
  ok('the same number reuses the live job (single-flight)', again.id === job0.id, `${again.id} vs ${job0.id}`);

  // walk starting → code
  let job = job0;
  for (let i = 0; i < 25 && job.state !== 'code'; i++) {
    await sleep(150);
    job = await (await fetch(`${base}/api/pair/${job0.id}`)).json();
  }
  ok('the code arrives with a TTL', job.state === 'code' && Boolean(job.code) && job.codeExpiresIn > 0, JSON.stringify(job).slice(0, 120));

  const recoded = await (await fetch(`${base}/api/pair/${job0.id}/code`, { method: 'POST' })).json();
  ok('a fresh code can be requested', recoded.state === 'code' && Boolean(recoded.code), JSON.stringify(recoded).slice(0, 100));

  // walk code → linking → ready
  for (let i = 0; i < 40 && job.state !== 'ready'; i++) {
    await sleep(150);
    job = await (await fetch(`${base}/api/pair/${job0.id}`)).json();
  }
  ok('the job reaches ready', job.state === 'ready', JSON.stringify(job).slice(0, 140));
  ok('ready hands over a prefixed SESSION_ID', /^NOVA-MD~[A-Za-z0-9+/=]+$/.test(job.session || ''), (job.session || '').slice(0, 24));

  // the site's own string must load in the bot
  const botDir = await fs.mkdtemp(path.join(os.tmpdir(), 'nova-live-'));
  const loaded = await useSessionStringAuthState(job.session, botDir, { info() {} });
  ok('the live SESSION_ID parses with the bot loader', Boolean(loaded.state.creds.me?.id), JSON.stringify(loaded.state.creds.me));
  await fs.rm(botDir, { recursive: true, force: true });

  const consumed = await (await fetch(`${base}/api/pair/${job0.id}?consume=1`)).json();
  ok('consume returns the session once', consumed.state === 'ready' && Boolean(consumed.session));
  const gone = await fetch(`${base}/api/pair/${job0.id}?consume=1`);
  ok('a second consume is gone (one-time read)', gone.status === 404, String(gone.status));

  const cancelledJob = await (await fetch(`${base}/api/pair`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ number: '2348099999999' }) })).json();
  const cancelled = await (await fetch(`${base}/api/pair/${cancelledJob.id}/cancel`, { method: 'POST' })).json();
  ok('cancel tears the job down', cancelled.cancelled === true);
  ok('a cancelled job is no longer found', (await fetch(`${base}/api/pair/${cancelledJob.id}`)).status === 404);

  const unknown = await fetch(`${base}/api/pair/deadbeef`);
  ok('unknown ids 404 instead of hanging', unknown.status === 404);
} finally {
  child.kill('SIGTERM');
  await sleep(200);
  if (!child.killed) child.kill('SIGKILL');
}

/* ── Railway injects PORT, not WEB_PORT ─────────────────────────────── */
const RAIL_PORT = PORT + 1;
const rail = spawn(process.execPath, ['web/server.js'], {
  cwd: process.cwd(),
  // deliberately no WEB_PORT: this is exactly what Railway provides
  env: { ...process.env, PAIR_FAKE: '1', PORT: String(RAIL_PORT), WEB_PORT: '', LOG_LEVEL: 'error' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let railUp = false;
for (let i = 0; i < 60 && !railUp; i++) {
  await sleep(200);
  railUp = await fetch(`http://127.0.0.1:${RAIL_PORT}/health`).then((r) => r.ok).catch(() => false);
}
ok('the pairer listens on an injected PORT with no WEB_PORT (Railway)', railUp);
if (railUp) {
  const page = await fetch(`http://127.0.0.1:${RAIL_PORT}/`).then((r) => r.text()).catch(() => '');
  ok('that instance serves the pairing page', /SESSION_ID/.test(page));
}
rail.kill('SIGTERM');
await sleep(150);
if (!rail.killed) rail.kill('SIGKILL');

/* ── single-use mode, for a link you are about to delete ───────────── */
const ONCE_PORT = PORT + 2;
const onceSrv = spawn(process.execPath, ['web/server.js'], {
  cwd: process.cwd(),
  env: { ...process.env, PAIR_FAKE: '1', PAIR_ONCE: '1', PORT: String(ONCE_PORT), WEB_PORT: '', LOG_LEVEL: 'error' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let onceUp = false;
for (let i = 0; i < 60 && !onceUp; i++) {
  await sleep(200);
  onceUp = await fetch(`http://127.0.0.1:${ONCE_PORT}/health`).then((r) => r.ok).catch(() => false);
}
ok('single-use instance boots', onceUp);
if (onceUp) {
  const health = await (await fetch(`http://127.0.0.1:${ONCE_PORT}/health`)).json();
  ok('health advertises single-use mode', health.once === true && health.used === false, JSON.stringify(health));

  const post = (number) => fetch(`http://127.0.0.1:${ONCE_PORT}/api/pair`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ number }),
  });
  const first = await post('2348011111111');
  ok('the first pairing is accepted', first.status === 200, String(first.status));

  // wait for it to reach ready, which is what burns the single use
  let state = '';
  for (let i = 0; i < 40 && state !== 'ready'; i++) {
    await sleep(150);
    state = (await (await fetch(`http://127.0.0.1:${ONCE_PORT}/health`)).json()).used ? 'ready' : 'waiting';
  }
  ok('a completed pairing burns the single use', state === 'ready');

  const second = await post('2348022222222');
  const body = await second.json();
  ok('a second pairing is refused with 403', second.status === 403 && /single-use/i.test(body.error), JSON.stringify(body));

  const healthAfter = await (await fetch(`http://127.0.0.1:${ONCE_PORT}/health`)).json();
  ok('health shows it has been used', healthAfter.used === true);

  const page = await fetch(`http://127.0.0.1:${ONCE_PORT}/`).then((r) => r.text()).catch(() => '');
  ok('the page still loads after the single use is spent', /SESSION_ID/.test(page));
}
onceSrv.kill('SIGTERM');
await sleep(150);
if (!onceSrv.killed) onceSrv.kill('SIGKILL');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
