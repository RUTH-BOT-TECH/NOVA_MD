/**
 * Owner/security tests.
 *
 * The access-control cases go through the real handler (handleIncoming) with the
 * fake socket, because the point of a ban is that the *handler* drops the
 * message — testing the plugin alone would prove nothing.
 */
import { loadPlugins } from '../src/lib/loader.js';
import { JsonStore } from '../src/lib/store.js';
import { handleIncoming } from '../src/handler.js';
import { makeSocket, incoming, GROUP_JID } from './fake-socket.mjs';
import { sc } from '../src/lib/ui.js';

const registry = await loadPlugins('plugins');
const store = new JsonStore(':memory:');
store.data = {};

const config = {
  botName: 'NOVA-MD', ownerName: 'Owner', prefixes: ['.'], mode: 'public',
  cooldownMs: 0, autoRead: false, autoTyping: false,
  economy: { symbol: 'ª', startBalance: 1000, dailyAmount: 2500 },
};
const runtime = { uptime: () => 65_000 };
const logger = { info() {}, warn() {}, error() {}, debug() {} };

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label} ${detail}`); }
};
const clean = (s) => String(s).replace(/\n/g, ' | ').slice(0, 96);

const sock = await makeSocket();
sock.fetchBlocklist = async () => ['2348099990001@s.whatsapp.net', '2348099990002@s.whatsapp.net'];

const OWNER = '2348000000001';
const USER = '2348000000002';
const OTHER = '2348000000003';

/** Send one message through the whole pipeline and return what the bot said. */
async function say(text, { sender = USER, group = false, fromMe = false, jid } = {}) {
  const before = sock.sent.length;
  const msg = incoming({ text, sender, group, fromMe, jid: jid || (group ? undefined : `${sender}@s.whatsapp.net`) });
  await handleIncoming({ sock, msg, registry, cfg: config, logger, store, runtime });
  return sock.sent.slice(before).map((s) => s.content.text || s.content.caption || '[media]').join('\n');
}
/** Same, but bypassing the handler — for commands that reply privately. */
async function run(name, argsText = '', { sender = OWNER, group = false, fromMe = true } = {}) {
  let out = '';
  const plugin = registry.get(name);
  if (!plugin) throw new Error(`no plugin ${name}`);
  const msg = incoming({
    text: `.${name} ${argsText}`.trim(), sender, group, fromMe,
    jid: group ? undefined : `${sender}@s.whatsapp.net`,
  });
  await plugin.run({
    argsText, args: String(argsText).split(' ').filter(Boolean), prefix: '.', command: name,
    store, config, senderJid: `${sender}@s.whatsapp.net`, sender, jid: group ? GROUP_JID : `${sender}@s.whatsapp.net`,
    pushName: 'Tester', msg, message: msg.message, registry, runtime, sock,
    reply: async (c) => { out = c.text ?? c.caption ?? `[${Object.keys(c).join('+')}]`; },
    react: async () => {},
  });
  return out;
}

/* ── baseline ─────────────────────────────────────────────────────── */
const ping = await say('.ping');
ok('a normal user gets an answer before any ban', /ᴘɪɴɢ/.test(ping), 'no reply');
ok('ping answers in one framed block', ping.includes('┏❐') && ping.includes('┗❐'), clean(ping));
ok('ping reports a measured round-trip', ping.includes(sc('round-trip')) && /\d+ms/.test(ping), clean(ping));
ok('ping reports uptime, memory and plugin count', ['uptime', 'memory', 'plugins'].every((k) => ping.includes(sc(k))), clean(ping));
ok('ping says whether the socket is linked', /connected|not linked/.test(ping), clean(ping));
ok('ping names the host it runs on', ping.includes(sc('host')) && ping.includes('Local'), clean(ping));
ok('an unknown command is ignored, not answered', (await say('.notacommand')) === '');

/* ── ban a user ───────────────────────────────────────────────────── */
const banned = await run('banuser', USER);
ok('banuser confirms the ban', new RegExp(USER).test(banned), clean(banned));
ok('the ban is stored in __global__', (store.get('__global__').bannedUsers || []).includes(USER), JSON.stringify(store.get('__global__')));

sock.sent.length = 0;
ok('a banned user is dropped by the handler', (await say('.ping')) === '');
ok('a banned user cannot use another command either', (await say('.menu', { group: true })) === '');
ok('everyone else still works', /pong|ᴘɪɴɢ/i.test(await say('.ping', { sender: OTHER })));
ok('the owner is never blocked', /pong|ᴘɪɴɢ/i.test(await say('.ping', { sender: USER, fromMe: true })));
ok('banuser on an already-banned number says so', /already/i.test(await run('banuser', USER)));

const unbanned = await run('unbanuser', USER);
ok('unbanuser reports success', /can use the bot again/i.test(unbanned), clean(unbanned));
ok('the unbanned user is answered again', /pong|ᴘɪɴɢ/i.test(await say('.ping')));
ok('unbanuser on someone not banned is honest', /not banned/i.test(await run('unbanuser', '2348999999999')));

/* ── lock a chat ──────────────────────────────────────────────────── */
const locked = await run('banchat', '', { group: true });
ok('banchat locks the group', /locked/i.test(locked), clean(locked));
ok('the lock is stored', (store.get('__global__').bannedChats || []).includes(GROUP_JID));
ok('non-owners are ignored in a locked chat', (await say('.ping', { group: true })) === '');
ok('the owner still works in a locked chat', /pong|ᴘɪɴɢ/i.test(await say('.ping', { group: true, fromMe: true })));
const unlocked = await run('unbanchat', '', { group: true });
ok('unbanchat lifts the lock', /unlocked/i.test(unlocked), clean(unlocked));
ok('the group works again', /pong|ᴘɪɴɢ/i.test(await say('.ping', { group: true })));

/* ── banlist / blocklist ──────────────────────────────────────────── */
await run('banuser', '2348000000009');
const list = await run('banlist');
ok('banlist lists banned users', /2348000000009/.test(list), clean(list));
ok('banlist counts them', /ᴜꜱᴇʀꜱ|users/i.test(list));

const blocked = await run('blocklist');
ok('blocklist reads the socket blocklist', /2348099990001/.test(blocked) && blocked.includes(sc('blocked')), clean(blocked));

const noBlock = { ...sock, fetchBlocklist: async () => [] };
let emptyBlock = '';
await registry.get('blocklist').run({
  argsText: '', args: [], prefix: '.', command: 'blocklist', store, config, senderJid: `${OWNER}@s.whatsapp.net`,
  sender: OWNER, jid: `${OWNER}@s.whatsapp.net`, msg: incoming({ text: '.blocklist', fromMe: true }), sock: noBlock,
  reply: async (c) => { emptyBlock = c.text; }, react: async () => {},
});
ok('an empty blocklist says so', /Nobody is blocked/i.test(emptyBlock), clean(emptyBlock));

/* ── prefix ───────────────────────────────────────────────────────── */
const pref = await run('setprefix', '#');
ok('setprefix confirms the change', /prefix is now/i.test(pref), clean(pref));
ok('the prefix is persisted', store.get('__global__').prefix === '#', String(store.get('__global__').prefix));
ok('the old prefix stops working', (await say('.ping')) === '');
ok('the new prefix works', /pong|ᴘɪɴɢ/i.test(await say('#ping')));
ok('a letter is refused as a prefix', /one symbol/i.test(await run('setprefix', 'x')));
await run('setprefix', '.');
ok('the dot works again', /pong|ᴘɪɴɢ/i.test(await say('.ping')));

/* ── diagnostics ──────────────────────────────────────────────────── */
const api = await run('apicheck');
const apiHits = (api.match(/✅/g) || []).length;
ok('apicheck probes several APIs and reports each', (api.match(/┣◆/g) || []).length >= 5, clean(api));
ok('at least three APIs answered from here', apiHits >= 3, `${apiHits} up — ${clean(api)}`);
ok('apicheck prints a reachable count', api.includes(sc('reachable')), clean(api));

const self = await run('selftest');
ok('selftest reports the plugin count', self.includes(sc('plugins loaded')) && /\d+ commands/.test(self), clean(self));
ok('selftest checks the store round-trip', self.includes(sc('store write/read')), clean(self));
ok('selftest gives a verdict', self.includes(sc('result')), clean(self));

const dl = await run('dlcheck');
ok('dlcheck reports a yt-dlp row', dl.includes(sc('yt-dlp')), clean(dl));
ok('dlcheck reports ffmpeg honestly', dl.includes(sc('ffmpeg')) && (dl.includes('✅') || dl.includes('❌')), clean(dl));
ok('dlcheck gives a verdict', dl.includes(sc('verdict')), clean(dl));

/* ── backup / mydata / ownermenu ──────────────────────────────────── */
await say('.daily');
let backupDoc = null, backupName = '', backupCaption = '';
await registry.get('backupnow').run({
  argsText: '', args: [], prefix: '.', command: 'backupnow', store, config,
  senderJid: `${OWNER}@s.whatsapp.net`, sender: OWNER, jid: `${OWNER}@s.whatsapp.net`,
  msg: incoming({ text: '.backupnow', fromMe: true }), sock,
  reply: async (c) => { backupDoc = c.document; backupName = c.fileName; backupCaption = c.caption || ''; }, react: async () => {},
});
const parsed = backupDoc ? JSON.parse(backupDoc.toString('utf8')) : null;
ok('backupnow returns a JSON document', Boolean(parsed) && parsed.bot === 'NOVA-MD', String(backupName));
ok('the backup really contains the stored settings', Boolean(parsed?.data?.['__global__']), Object.keys(parsed?.data || {}).slice(0, 3).join(','));
ok('the backup file is named with a date', /\d{4}-\d{2}-\d{2}/.test(backupName), backupName);
ok('the backup caption admits sessions are not included', /sessions and keys are not in here/i.test(backupCaption), clean(backupCaption));

await say('.daily', { sender: OTHER });
const mine = await run('mydata', '', { sender: OTHER, fromMe: false });
ok('mydata shows the caller’s own record', mine.includes(sc('account')) && mine.includes(sc('banned')) && /₦/.test(mine), clean(mine));
ok('mydata is honest about not storing keys', /Signal keys are never stored/i.test(mine), clean(mine));

const menu = await run('ownermenu');
ok('ownermenu lists owner commands', /banuser/.test(menu) && /selftest/.test(menu), clean(menu));
ok('ownermenu shows the active prefix', menu.includes(sc('prefix')), clean(menu));

/* ── guards still hold for non-owners ─────────────────────────────── */
ok('a non-owner cannot run an owner command', /owner only/i.test(await say('.banuser 2348999999999')), 'no guard');
ok('a non-owner cannot selftest', /owner only/i.test(await say('.selftest')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
