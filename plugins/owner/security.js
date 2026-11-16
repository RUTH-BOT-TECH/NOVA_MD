import fs from 'node:fs/promises';
import path from 'node:path';
import { row, sc } from '../../src/lib/ui.js';
import { fetchJson } from '../../src/lib/http.js';
import { targetOf } from '../../src/lib/economy.js';
import { config as appConfig } from '../../src/config.js';

/**
 * Owner controls that change how the bot behaves: who is allowed to talk to it,
 * which chats are locked, which prefix it listens on — plus diagnostics that
 * say plainly what this install can and cannot do.
 *
 * Every switch here lives in the shared `__global__` store entry, which is what
 * the handler reads, so a change takes effect on the very next message.
 */

const frame = (title, lines) => [`┏❐ 《 ${sc(title)} 》 ❐`, ...lines, '┗❐'].join('\n');
const GLOBAL = '__global__';

const globals = (store) => store.get(GLOBAL) || {};
const patchGlobals = (store, patch) => store.set(GLOBAL, { ...globals(store), ...patch });

/** Resolve whoever the owner pointed at: mention → reply → number. */
const who = (argsText, msg) => targetOf(argsText, msg);

/** `which`-style lookup that also accepts an absolute path. */
async function which(bin) {
  if (!bin) return null;
  if (bin.includes('/')) return fs.access(bin).then(() => bin, () => null);
  for (const dir of (process.env.PATH || '').split(':')) {
    if (!dir) continue;
    const full = path.join(dir, bin);
    if (await fs.access(full).then(() => true, () => false)) return full;
  }
  return null;
}

const ms = (t0) => `${Date.now() - t0}ms`;

export default [
  /* ── access control ─────────────────────────────────────────────── */
  {
    name: 'banuser',
    category: 'owner',
    description: 'Stop a number from using the bot',
    usage: '.banuser 2348012345678  ·  or reply / mention',
    ownerOnly: true,
    async run({ argsText, msg, store, reply }) {
      const target = who(argsText, msg);
      if (!target) return reply({ text: 'Usage: .banuser <number>  (or reply to them)' });
      const banned = globals(store).bannedUsers || [];
      if (banned.includes(target)) return reply({ text: `Already banned: *${target}*` });
      patchGlobals(store, { bannedUsers: [...banned, target] });
      await reply({ text: `🚫 Banned *${target}* — the bot ignores them from now on.` });
    },
  },

  {
    name: 'unbanuser',
    category: 'owner',
    description: 'Give a number its access back',
    usage: '.unbanuser 2348012345678',
    ownerOnly: true,
    async run({ argsText, msg, store, reply }) {
      const target = who(argsText, msg);
      if (!target) return reply({ text: 'Usage: .unbanuser <number>' });
      const banned = globals(store).bannedUsers || [];
      if (!banned.includes(target)) return reply({ text: `*${target}* is not banned.` });
      patchGlobals(store, { bannedUsers: banned.filter((n) => n !== target) });
      await reply({ text: `✅ *${target}* can use the bot again.` });
    },
  },

  {
    name: 'banlist',
    category: 'owner',
    description: 'Who and which chats are banned',
    usage: '.banlist',
    ownerOnly: true,
    privateOnly: true,
    async run({ store, reply }) {
      const g = globals(store);
      const users = g.bannedUsers || [];
      const chats = g.bannedChats || [];
      if (!users.length && !chats.length) return reply({ text: 'Nothing banned.' });
      await reply({
        text: frame('banlist', [
          row('users', String(users.length)),
          ...users.slice(0, 20).map((u, i) => `┣◆ ${i + 1}. ${u}`),
          row('chats', String(chats.length)),
          ...chats.slice(0, 20).map((c, i) => `┣◆ ${i + 1}. ${c}`),
        ]),
      });
    },
  },

  {
    name: 'banchat',
    category: 'owner',
    description: 'Lock this chat — only the owner gets through',
    usage: '.banchat',
    ownerOnly: true,
    groupOnly: true,
    async run({ jid, store, reply }) {
      const chats = globals(store).bannedChats || [];
      if (chats.includes(jid)) return reply({ text: 'This chat is already locked.' });
      patchGlobals(store, { bannedChats: [...chats, jid] });
      await reply({ text: '🔒 Chat locked. Only the owner can use commands here now.' });
    },
  },

  {
    name: 'unbanchat',
    category: 'owner',
    description: 'Unlock this chat',
    usage: '.unbanchat',
    ownerOnly: true,
    groupOnly: true,
    async run({ jid, store, reply }) {
      const chats = globals(store).bannedChats || [];
      if (!chats.includes(jid)) return reply({ text: 'This chat is not locked.' });
      patchGlobals(store, { bannedChats: chats.filter((c) => c !== jid) });
      await reply({ text: '🔓 Chat unlocked — everyone can use commands again.' });
    },
  },

  {
    name: 'blocklist',
    category: 'owner',
    description: "WhatsApp's blocked contacts, read from the socket",
    usage: '.blocklist',
    ownerOnly: true,
    privateOnly: true,
    async run({ sock, reply }) {
      if (typeof sock.fetchBlocklist !== 'function') {
        return reply({ text: "⚠️ This Baileys build does not expose the blocklist." });
      }
      const list = await sock.fetchBlocklist().catch(() => null);
      if (!list) return reply({ text: '❌ WhatsApp did not answer the blocklist request.' });
      if (!list.length) return reply({ text: 'Nobody is blocked on this account.' });
      await reply({
        text: frame('blocklist', [row('blocked', String(list.length)), ...list.slice(0, 30).map((j, i) => `┣◆ ${i + 1}. ${j.split('@')[0]}`)]),
      });
    },
  },

  /* ── prefix ──────────────────────────────────────────────────────── */
  {
    name: 'setprefix',
    category: 'owner',
    description: 'Change the command prefix and keep it',
    usage: '.setprefix #',
    ownerOnly: true,
    async run({ argsText, store, reply, config }) {
      const raw = String(argsText).trim();
      if (!raw) return reply({ text: `Current prefix: *${(globals(store).prefix || config.prefixes[0])}*` });
      if (!/^[^\w\s]$/.test(raw)) return reply({ text: '⚠️ One symbol only — for example `.` `#` `!` `/`' });
      patchGlobals(store, { prefix: raw });
      config.prefixes = [raw];
      await reply({ text: `⚙️ Prefix is now *${raw}* — saved, so it survives a restart.` });
    },
  },

  /* ── diagnostics ─────────────────────────────────────────────────── */
  {
    name: 'apicheck',
    aliases: ['apis'],
    category: 'owner',
    description: 'Probe the external APIs the bot actually uses',
    usage: '.apicheck',
    ownerOnly: true,
    cooldownMs: 20_000,
    async run({ reply }) {
      const probes = [
        ['deezer', () => fetchJson('https://api.deezer.com/search?q=nova&limit=1', { timeout: 8000 })],
        ['itunes', () => fetchJson('https://itunes.apple.com/search?term=nova&limit=1', { timeout: 8000 })],
        ['aladhan', () => fetchJson('https://api.aladhan.com/v1/timingsByCity?city=Lagos&country=NG&method=2', { timeout: 8000 })],
        ['open-meteo', () => fetchJson('https://geocoding-api.open-meteo.com/v1/search?name=lagos&count=1', { timeout: 8000 })],
        ['animechan', () => fetchJson('https://api.animechan.io/v1/quotes/random', { timeout: 8000 })],
        ['purrbot', () => fetchJson('https://api.purrbot.site/v2/img/sfw/hug/gif', { timeout: 8000 })],
      ];
      const results = await Promise.all(probes.map(async ([name, call]) => {
        const t0 = Date.now();
        try {
          const data = await call();
          return { name, ok: Boolean(data), ms: ms(t0) };
        } catch (err) {
          return { name, ok: false, ms: ms(t0), why: err.message.slice(0, 40) };
        }
      }));
      const up = results.filter((r) => r.ok).length;
      await reply({
        text: [
          '┏❐ 《 ᴀᴘɪ ᴄʜᴇᴄᴋ 》 ❐',
          ...results.map((r) => `┣◆ ${r.ok ? '✅' : '❌'} ${r.name} · ${r.ms}${r.ok ? '' : ` · ${r.why}`}`),
          row('reachable', `${up}/${results.length}`),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'dlcheck',
    aliases: ['downloadercheck'],
    category: 'owner',
    description: 'What this install can actually download with',
    usage: '.dlcheck',
    ownerOnly: true,
    async run({ reply }) {
      const ytdlp = await which(process.env.YTDLP_PATH || 'yt-dlp');
      const ffmpeg = await which(process.env.FFMPEG_PATH || 'ffmpeg');
      let ytdlCore = false;
      try { await import('@distube/ytdl-core'); ytdlCore = true; } catch { /* optional */ }

      const rows = [
        row('yt-dlp', ytdlp ? `✅ ${ytdlp}` : '❌ not found'),
        row('ffmpeg', ffmpeg ? `✅ ${ffmpeg}` : '❌ not found (audio commands need it)'),
        row('ytdl-core', ytdlCore ? '✅ installed' : '❌ not installed'),
        row('download api', process.env.DOWNLOAD_API_URL ? '✅ configured' : '— not set'),
        row('piped', process.env.PIPED_URL || '— not set'),
        row('invidious', process.env.INVIDIOUS_URL || '— not set'),
        row('cookies', process.env.YTDLP_COOKIES ? '✅ set' : '— not set'),
      ];
      const usable = Boolean(ytdlp || process.env.DOWNLOAD_API_URL || ytdlp);
      await reply({ text: frame('downloaders', [...rows, row('verdict', usable ? 'downloads can run' : 'nothing to download with')]) });
    },
  },

  {
    name: 'selftest',
    category: 'owner',
    description: 'Check the moving parts of this install',
    usage: '.selftest',
    ownerOnly: true,
    cooldownMs: 10_000,
    async run({ reply, registry, store, config, runtime }) {
      const checks = [];
      const add = (label, ok, detail = '') => checks.push({ label, ok, detail });

      const plugins = registry ? [...new Set(registry.values())] : [];
      add('plugins loaded', plugins.length > 0, `${plugins.length} commands`);
      add('categories', new Set(plugins.map((p) => p.category)).size > 0, `${new Set(plugins.map((p) => p.category)).size}`);

      // store round-trip
      const key = `__selftest__:${Date.now()}`;
      store.set(key, { ok: true });
      add('store write/read', store.get(key)?.ok === true);
      store.delete(key);

      add('prefix', Array.isArray(config.prefixes) && config.prefixes.length > 0, config.prefixes.join(' '));
      add('mode', ['public', 'self'].includes(config.mode), config.mode);
      add('ffmpeg', Boolean(await which(process.env.FFMPEG_PATH || 'ffmpeg')), 'audio/video');
      add('yt-dlp', Boolean(await which(process.env.YTDLP_PATH || 'yt-dlp')), 'downloads');
      add('ai key', Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.DEEPSEEK_API_KEY), 'optional');
      add('uptime', true, `${Math.round((runtime?.uptime?.() || 0) / 1000)}s`);

      const bad = checks.filter((c) => !c.ok);
      await reply({
        text: [
          '┏❐ 《 ꜱᴇʟꜰᴛᴇꜱᴛ 》 ❐',
          ...checks.map((c) => `┣◆ ${c.ok ? '✅' : '❌'} ${sc(c.label)}${c.detail ? ` · ${c.detail}` : ''}`),
          row('result', bad.length ? `${bad.length} need attention` : 'all clear'),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'backupnow',
    aliases: ['backup'],
    category: 'owner',
    description: 'Download this install’s settings as JSON',
    usage: '.backupnow',
    ownerOnly: true,
    privateOnly: true,
    cooldownMs: 15_000,
    async run({ store, reply }) {
      const data = store.data || {};
      const entries = Object.keys(data).length;
      if (!entries) return reply({ text: 'Nothing to back up yet — no settings stored.' });
      const payload = { bot: appConfig.botName, takenAt: new Date().toISOString(), entries, data };
      const bytes = Buffer.from(JSON.stringify(payload, null, 2));
      await reply({
        document: bytes,
        mimetype: 'application/json',
        fileName: `nova-md-backup-${new Date().toISOString().slice(0, 10)}.json`,
        caption: `🗄️ ${entries} entries · ${(bytes.length / 1024).toFixed(1)} KB\n_Settings only — sessions and keys are not in here._`,
      });
    },
  },

  {
    name: 'mydata',
    category: 'owner',
    description: 'Everything this bot has stored about you',
    usage: '.mydata',
    async run({ store, sender, reply }) {
      const account = store.get(`user:${sender}`) || {};
      const notes = store.get(`notes:${sender}`, 'notes', []) || [];
      const g = globals(store);
      const wallet = typeof account.wallet === 'number' ? account.wallet : null;
      await reply({
        text: frame('mydata', [
          row('account', wallet === null ? 'none yet' : `₦${wallet.toLocaleString()} · ${account.xp || 0} xp`),
          row('notes', String(notes.length || 0)),
          row('banned', (g.bannedUsers || []).includes(sender) ? 'yes' : 'no'),
          row('owner', (g.owners || []).includes(sender) ? 'yes' : 'no'),
          `┃ ${sc('note')} : sessions and Signal keys are never stored here`,
        ]),
      });
    },
  },

  {
    name: 'ownermenu',
    aliases: ['adminmenu'],
    category: 'owner',
    description: 'Owner-only commands',
    usage: '.ownermenu',
    ownerOnly: true,
    async run({ registry, reply, prefix }) {
      const owner = [...new Set(registry.values())].filter((p) => p.ownerOnly);
      const byCat = new Map();
      for (const p of owner) {
        const cat = p.category || 'misc';
        if (!byCat.has(cat)) byCat.set(cat, []);
        byCat.get(cat).push(p.name);
      }
      const lines = [...byCat.entries()].sort(([a], [b]) => a.localeCompare(b))
        .map(([cat, names]) => `┣◆ ${sc(cat)} (${names.length}) — ${names.sort().join(', ')}`);
      await reply({ text: ['┏❐ 《 ᴏᴡɴᴇʀ 》 ❐', ...lines, `┃ ${sc('prefix')} : ${prefix}`, '┗❐'].join('\n') });
    },
  },
];
