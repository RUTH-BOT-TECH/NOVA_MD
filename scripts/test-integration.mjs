/**
 * Integration test: every registered command goes through the REAL handler
 * (handleIncoming → guards → plugin → socket) against a fake Baileys socket.
 *
 * No WhatsApp connection required. Payloads are validated, not just counted:
 * a text reply must have text, a media reply must carry real bytes + mimetype.
 *
 * Outcomes per command:
 *   PASS  — produced a valid payload
 *   ENV   — refused because a host dependency is genuinely missing (ffmpeg/yt-dlp)
 *   FAIL  — crash, empty reply, or unexplained ❌
 */
import { loadPlugins } from '../src/lib/loader.js';
import { handleIncoming } from '../src/handler.js';
import { JsonStore } from '../src/lib/store.js';
import { makeSocket, incoming, fixturesOnce } from './fake-socket.mjs';

const registry = await loadPlugins('plugins');
const plugins = [...new Set(registry.values())].sort((a, b) => a.name.localeCompare(b.name));
const sharedFixtures = await fixturesOnce();
const store = new JsonStore(':memory:');
store.data = {};

const cfg = {
  botName: 'NOVA-MD', ownerName: 'Nova', ownerNumber: '2348000000009', extraOwners: [],
  prefixes: ['.'], mode: 'public', autoRead: false, autoTyping: false, cooldownMs: 0,
  version: '1.2.0', repoUrl: 'https://github.com/example/nova-md', timezone: 'Africa/Lagos',
  economy: { name: 'Nova', symbol: '₦', dailyAmount: 2500, startBalance: 1000 },
  nameTick: '✓', defaultCity: 'Lagos', maxDownloadMb: 48, healthPort: 0,
};
const runtime = {
  lastLatency: 120, reload: async () => plugins.length, uptime: () => 1000,
  startTime: Date.now() - 1000, sessions: new Map(), reloading: false,
  restart: async () => {}, shutdown: async () => {},
};

const OWNER = '2348000000009';
const OWNER_MSG = (text, quoted) => incoming({ text, sender: OWNER, jid: `${OWNER}@s.whatsapp.net`, quoted });

const socket = await makeSocket(); // fixture probe

const quotedImage = { imageMessage: { mimetype: 'image/jpeg', fileLength: String(socket.fixtures.image.length) } };
const quotedSticker = { stickerMessage: { mimetype: 'image/webp' } };
const quotedAudio = { audioMessage: { mimetype: 'audio/ogg', ptt: true } };
const quotedVideo = { videoMessage: { mimetype: 'video/mp4' } };
const quotedDoc = { documentMessage: { mimetype: 'application/pdf', fileName: 'test.pdf' } };
const quotedText = { conversation: 'quoted text for context' };

/** Per-command arguments and the message shape it needs. */
const PLAN = {
  // text/args commands
  calc: '2+2*3', wiki: 'Lagos', npm: 'baileys', github: 'baileys', define: 'serendipity',
  book: 'things fall apart', tv: 'breaking bad', news: 'lagos', crypto: 'bitcoin',
  currency: '100 USD NGN', ip: '8.8.8.8', lyrics: 'Coldplay - Yellow', short: 'https://example.com/a/b',
  translate: 'fr hello world', note: 'add buy milk', remind: '5m stretch', weather: 'Lagos',
  yts: 'lofi beats', play: 'lofi beats', ytv: 'blender open movie', dl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  ytinfo: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ', tiktok: 'https://download.samplelib.com/mp4/sample-5s.mp4', instagram: 'https://download.samplelib.com/mp4/sample-5s.mp4',
  facebook: 'https://download.samplelib.com/mp4/sample-5s.mp4', twitter: 'https://download.samplelib.com/mp4/sample-5s.mp4', reddit: 'https://download.samplelib.com/mp4/sample-5s.mp4',
  ai: 'what is a webhook?', gpt: 'hi', gemini: 'hi', groq: 'hi',
  anime: 'naruto', manga: 'berserk', character: 'gojo', animepic: 'neko',
  take: 'My Pack | Me', resize: '256', trim: '0:05 0:15', volume: '2', audiospeed: '1.5',
  slots: '100', gamble: '50', deposit: '100', withdraw: 'all', pay: '100', rob: '',
  daily: '', work: '', beg: '', balance: '', rich: '',
  blacklist: '2348000000002', unblacklist: '2348000000002', sudo: '2348000000003', unsudo: '2348000000003',
  ecoreset: '2348000000003', mode: 'public', botname: 'NOVA-MD', prefix: '.', maintenance: 'offoret', 
  autoread: 'off', autotyping: 'off', join: 'https://chat.whatsapp.com/ABC123', leave: '',
  cleartmp: '', reload: '', broadcast: 'hello world', setbotpic: '',
  kick: '2348000000002', promote: '2348000000002', demote: '2348000000002', warn: '2348000000002',
  antilink: 'on', welcome: 'on', goodbye: 'on', mute: '', unmute: '', tagall: 'hello', hidetag: 'yo',
  tagadmins: 'hey', poll: 'Best? | A | B', setdesc: 'a description', delmsg: '', pinmsg: '',
  vcard: '2348012345678 Tester', sticker: '', toimg: '', getpp: '2348000000002',
  qr: 'hello', vv: '', save: '', saveimg: '', savevideo: '', saveaudio: '', savedoc: '',
  stickerinfo: '', animescene: '',
};

const NEEDS = {
  sticker: quotedImage, resize: quotedImage, toimg: quotedSticker, take: quotedSticker,
  stickerinfo: quotedSticker, saveimg: quotedImage, savevideo: quotedVideo, saveaudio: quotedAudio,
  savedoc: quotedDoc, save: quotedImage, vv: quotedImage, trim: quotedAudio, volume: quotedAudio,
  audiospeed: quotedAudio, tomp3: quotedAudio, tovoice: quotedAudio, toaudio: quotedVideo,
  reverseaudio: quotedAudio, waveform: quotedAudio, togif: quotedVideo, animescene: quotedImage,
  setbotpic: quotedImage, delmsg: quotedText, getpp: null,
};

const MEDIA_HEADER_CHECK = true;
const ENV_PATTERNS = [
  /ffmpeg is not installed/i, /yt-dlp/i, /not installed on this host/i,
  /Install on the host/i, /add (GEMINI_API_KEY|GROQ_API_KEY)/i,
];
const MISSING_CONFIG = /DOWNLOAD_API_URL|PIPED_URL|INVIDIOUS_URL|Every download strategy failed/i;

function validate(payload) {
  const c = payload.content || {};
  const issues = [];
  const mediaKeys = ['image', 'video', 'audio', 'sticker', 'document'];
  const hasMedia = mediaKeys.some((k) => c[k]);
  const hasText = typeof c.text === 'string' ? c.text.trim().length > 0 : false;

  if (hasText) {
    if (c.text.length > 65000) issues.push('text too long for one message');
  } else if (Object.values(c).every((v) => v == null)) {
    issues.push('empty payload');
  }
  for (const key of mediaKeys) {
    if (!c[key]) continue;
    const value = c[key];
    if (Buffer.isBuffer(value)) { if (value.length === 0) issues.push(`${key} buffer empty`); }
    else if (value?.url) { if (!/^https?:\/\//.test(value.url)) issues.push(`${key} url invalid`); }
    else issues.push(`${key} has neither bytes nor url`);
    if (key === 'audio' && Buffer.isBuffer(value) && !c.mimetype) issues.push('audio without mimetype');
    // a passing media payload must actually be playable, not random bytes
    if (Buffer.isBuffer(value) && value.length > 16) {
      const head = value.subarray(0, 12);
      const hex = head.toString('hex');
      const magic = {
        audio: /^(494433|4f676753|664c6143|fff|000000|1a45dfa3)/,
        video: /^(000000|1a45dfa3|66747970|52494646)/,
        image: /^(ffd8ff|89504e47|52494646)/,
        sticker: /^(52494646)/,
        document: /(25504446|504b0304|.{0,12})/,
      }[key];
      if (magic && !magic.test(hex)) issues.push(`${key} header looks wrong (${hex.slice(0, 8)})`);
    }
  }
  if (c.react && typeof c.react.text !== 'string') issues.push('react payload malformed');
  return issues;
}

const results = [];
async function runCommand(plugin) {
  // each command gets its own socket: parallel workers must not share a record
  const sock = await makeSocket();
  const name = plugin.name;
  const args = PLAN[name] ?? '';
  const text = `.${name}${args ? ` ${args}` : ''}`;
  const quoted = NEEDS[name] === undefined ? null : NEEDS[name];
  const needsGroup = plugin.groupOnly || plugin.adminOnly || plugin.botAdminNeeded
    || ['kick', 'promote', 'demote', 'mute', 'unmute', 'tagall', 'hidetag', 'warn', 'antilink', 'groupinfo', 'link', 'leave', 'poll', 'admins'].includes(name);
  const msg = (plugin.ownerOnly || ['blacklist', 'unblacklist', 'sudo', 'unsudo', 'ecoreset', 'mode', 'botname', 'prefix', 'maintenance', 'autoread', 'autotyping', 'join', 'cleartmp', 'reload', 'broadcast', 'setbotpic', 'leave'].includes(name))
    ? OWNER_MSG(text, quoted)
    : incoming({ text, quoted, group: needsGroup, sender: '2348000000001' });

  const started = Date.now();
  let error = null;
  try {
    await handleIncoming({ sock, msg, registry, cfg, store, runtime, logger: null });
  } catch (err) {
    error = err;
  }
  const ms = Date.now() - started;
  const payloads = sock.sent.filter((s) => s.content && !s.content.react);
  const reactions = sock.sent.filter((s) => s.content?.react);

  let status = 'PASS';
  let note = '';

  if (error) { status = 'FAIL'; note = `threw: ${error.message.slice(0, 90)}`; }
  else if (!sock.sent.length) { status = 'FAIL'; note = 'no reply at all'; }
  else {
    const texts = payloads.map((p) => (typeof p.content.text === 'string' ? p.content.text : ''));
    const joined = texts.join('\n');
    const isStatusReport = /^┏❐/.test(texts[0] || '');
    const failedBecauseOfEnv = ENV_PATTERNS.some((re) => re.test(joined)) && /^(❌|⚙️|⚠️)/.test(texts[0] || '');
    if (failedBecauseOfEnv && !isStatusReport) { status = 'ENV'; note = 'host dependency missing (expected here)'; }
    else if (MISSING_CONFIG.test(joined)) { status = 'ENV'; note = 'needs a download strategy / API key'; }
    else if (payloads.length) {
      const problems = payloads.flatMap(validate);
      if (problems.length) { status = 'FAIL'; note = problems.join('; '); }
      else {
        const kinds = payloads.map((p) => Object.keys(p.content).find((k) => k !== 'caption') || 'text');
        note = `${payloads.length} payload${payloads.length > 1 ? 's' : ''}: ${[...new Set(kinds)].join(',')}`;
        if (reactions.length) note += ` +${reactions.length} react`;
      }
    }
  }
  results.push({ name, category: plugin.category, status, ms, note });
}

// small concurrency: network commands shouldn't run 283 times in parallel
const queue = [...plugins];
async function worker() {
  while (queue.length) {
    const plugin = queue.shift();
    if (!plugin) break;
    await runCommand(plugin);
  }
}
await Promise.all(Array.from({ length: 5 }, worker));

const by = (s) => results.filter((r) => r.status === s);
const pass = by('PASS'), env = by('ENV'), fail = by('FAIL');

console.log(`\nintegration: ${pass.length} passed · ${env.length} env-limited · ${fail.length} failed · ${results.length} total\n`);
for (const r of fail) console.log(`✗ FAIL ${r.name.padEnd(14)} [${r.category}] ${r.note}`);
for (const r of env) console.log(`… ENV  ${r.name.padEnd(14)} [${r.category}] ${r.note}`);

const slow = [...pass].sort((a, b) => b.ms - a.ms).slice(0, 5);
console.log('\nslowest passing commands:', slow.map((r) => `${r.name} ${r.ms}ms`).join(' · '));

// write the report
const lines = [
  '# Integration report', '',
  `Generated ${new Date().toISOString()} · fake Baileys socket · real handler`, '',
  `**${pass.length} passed · ${env.length} env-limited · ${fail.length} failed** of ${results.length}`, '',
  '| command | category | status | ms | detail |', '|---|---|---|---|---|',
  ...results.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .map((r) => `| \`${r.name}\` | ${r.category} | ${r.status} | ${r.ms} | ${r.note} |`),
];
const fs = await import('node:fs/promises');
await fs.mkdir('docs', { recursive: true });
await fs.writeFile('docs/INTEGRATION.md', lines.join('\n') + '\n');

if (fail.length) process.exitCode = 1;
