/** End-to-end pass over a sample from every new family. Run: npm run test:commands */
import { loadPlugins } from '../src/lib/loader.js';
import { handleIncoming } from '../src/handler.js';
import { config } from '../src/config.js';
import { JsonStore } from '../src/lib/store.js';

// README must never overstate the command count
import fs from 'node:fs/promises';

const registry = await loadPlugins(new URL('../plugins/', import.meta.url).pathname);
const store = new JsonStore('/tmp/nova-test-groups.json');
await store.load();

const BOT = '2348000000000:1@s.whatsapp.net';
const ADMIN = '2348222222222@s.whatsapp.net';
const sent = [];
const sock = {
  user: { id: BOT, name: 'NOVA-MD' },
  sendMessage: async (jid, content) => { sent.push(content); return { key: { id: 'x' } }; },
  sendPresenceUpdate: async () => {},
  readMessages: async () => {},
  groupMetadata: async () => ({
    subject: 'Nova Devs', id: '1203630@g.us', owner: ADMIN, creation: 1600000000,
    announce: false, restrict: true, desc: 'testing',
    participants: [
      { id: '2348111111111@s.whatsapp.net', admin: null },
      { id: ADMIN, admin: 'superadmin' },
      { id: BOT, admin: 'admin' },
    ],
  }),
  groupUpdateSubject: async () => {},
  groupUpdateDescription: async () => {},
  groupParticipantsUpdate: async () => [],
  groupSettingUpdate: async () => {},
  groupRevokeInvite: async () => 'NEWCODE',
  updateProfilePicture: async () => {},
};
const runtime = { startedAt: Date.now(), uptime: () => 3_725_000, lastLatency: 120 };

const cfg = { ...config, cooldownMs: 0, ownerNumber: ADMIN, extraOwners: [] };

async function run(text, { group = false } = {}) {
  sent.length = 0;
  const jid = group ? '1203630@g.us' : '2348111111111@s.whatsapp.net';
  await handleIncoming({
    sock,
    msg: {
      key: { remoteJid: jid, fromMe: false, id: 'm' + Math.random(), participant: group ? ADMIN : undefined },
      message: { conversation: text },
      pushName: 'Tester',
    },
    registry, cfg, logger: { info() {}, warn() {}, error() {} }, store, runtime,
  });
  return sent.map((c) => c.text || `<${Object.keys(c).join(',')}>`).join(' | ');
}

const cases = [
  ['.cm2inch 10'], ['.km2miles 42'], ['.celsius 37'], ['.dec2bin 255'], ['.num2roman 1994'],
  ['.roman2num MCMXCIV'], ['.words 1250'], ['.text2binary hi'], ['.datasize 1048576'],
  ['.rot13 Uryyb'], ['.caesar 3 hello'], ['.morse sos'], ['.atbash hello'], ['.sha256 hello'],
  ['.uuid'], ['.random-string 12 hex'], ['.coinflip'], ['.ship Nova & Dante'], ['.rps rock'],
  ['.horoscope leo'], ['.joke'], ['.riddle'], ['.uptime'], ['.date'], ['.changelog'],
  ['.setname Nova Devs HQ', { group: true }], ['.hidetag standup in 5', { group: true }],
  ['.tagadmins ping', { group: true }], ['.warn @2348111111111 spam', { group: true }],
  ['.warnings', { group: true }], ['.resetwarn all', { group: true }],
];

let ok = 0; const bad = [];
for (const [text, opts] of cases) {
  let out = '';
  try { out = await run(text, opts); } catch (err) { out = `THREW: ${err.message}`; }
  const failed = !out || /THREW|❌|failed\./.test(out) || /^Usage:/.test(out.trim());
  if (failed) bad.push([text, out.slice(0, 90)]); else ok++;
  console.log(`\n${failed ? '✗' : '✓'} ${text}\n  ${out.replace(/\n/g, ' ⏎ ').slice(0, 150)}`);
}
console.log(`\npassed ${ok}/${cases.length}`);
if (bad.length) console.log('CHECK THESE:\n' + bad.map(([c, o]) => `  ${c} → ${o}`).join('\n'));

// ── README table must match the registry exactly ──────────────────────────
const readme = await fs.readFile('README.md', 'utf8');
const claimed = {};
for (const m of readme.matchAll(/^\| ([a-z]+) \| (\d+) \|/gm)) claimed[m[1]] = Number(m[2]);
const actual = {};
for (const p of new Set(registry.values())) actual[p.category || 'misc'] = (actual[p.category || 'misc'] || 0) + 1;
const drift = Object.entries(actual).filter(([cat, n]) => claimed[cat] !== n);
const claimedTotal = Object.values(claimed).reduce((a, b) => a + b, 0);
if (drift.length || claimedTotal !== Object.values(actual).reduce((a, b) => a + b, 0)) {
  console.log('✗ README table drift:', drift.map(([c, n]) => `${c} says ${claimed[c] ?? '—'} but is ${n}`).join(', ')
    || `totals differ (README ${claimedTotal} vs ${Object.values(actual).reduce((a, b) => a + b, 0)})`);
  process.exitCode = 1;
} else {
  console.log('✓ README table matches registry');
}

// ── no command or alias may be silently swallowed by another plugin ───────
if (registry.collisions?.length) {
  console.log('✗ command collisions:');
  for (const c of registry.collisions) console.log(`   ${c.key}: ${c.kept} (${c.keptFile}) kept over ${c.dropped} (${c.droppedFile})`);
  process.exitCode = 1;
} else {
  console.log('✓ no command/alias collisions');
}
