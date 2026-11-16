import { row, duration, sc } from '../../src/lib/ui.js';
import { systemStats } from '../../src/lib/system.js';
import { bareJid } from '../../src/lib/message.js';

const now = (tz) => new Date().toLocaleString('en-GB', { timeZone: tz, dateStyle: 'full', timeStyle: 'medium' });

/** Plain informational command — text template. */
const info = (name, description, build, aliases = []) => ({
  name,
  aliases,
  category: 'general',
  description,
  usage: `.${name}`,
  async run(ctx) {
    await ctx.reply({ text: build(ctx) });
  },
});

export default [
  info('uptime', 'How long the bot has been running', ({ runtime }) => `⏱️ Up ${duration(runtime.uptime())}`),

  info('date', 'Today’s date in the bot timezone', ({ config }) => `📅 ${now(config.timezone).split(' at ')[0]}`),

  info('time', 'Current time in the bot timezone', ({ config }) =>
    `🕒 ${new Date().toLocaleTimeString('en-GB', { timeZone: config.timezone })} · ${config.timezone}`),

  info('botinfo', 'Name, version, host, library, commands', ({ config, runtime, registry, sock }) => {
    const s = systemStats();
    return [
      '┏❐ 《 ʙᴏᴛ ɪɴꜰᴏ 》 ❐',
      row('name', config.botName),
      row('version', `v${config.version}`),
      row('owner', config.ownerName),
      row('library', 'Baileys 6.7.24 (multi-device)'),
      row('host', s.host),
      row('node', s.node),
      row('cores', s.cores),
      row('uptime', duration(runtime.uptime())),
      row('commands', new Set(registry.values()).size),
      row('account', sock.user?.id || 'not linked'),
      '┗❐',
    ].join('\n');
  }),

  info('owner', 'Contact the bot owner', ({ config }) =>
    `👑 *${config.ownerName}*\nwa.me/${config.ownerNumber}\n\n_${config.repoUrl}_`),

  info('getsession', 'Get your own SESSION_ID from the pairing site', ({ config }) =>
    [
      '🔑 *Get a SESSION_ID*',
      '',
      `1. Open ${config.pairSiteUrl}`,
      '2. Type your number (country code, no +)',
      '3. Enter the 8-char code in WhatsApp → Linked devices',
      '4. Paste the SESSION_ID into your host’s env vars',
      '',
      '_The pairing site must be running — `npm run web`._',
    ].join('\n')),

  info('rules', 'Group rules template', ({ config }) =>
    [
      '*📋 Group rules*',
      '',
      '1. No spam, links or unsolicited DMs',
      '2. Respect every member — no abuse',
      '3. Keep it on-topic',
      '4. No NSFW content',
      '5. Breaking a rule = warning, then removal',
      '',
      `_enforced by ${config.botName}_`,
    ].join('\n')),

  info('tos', 'Terms of service', ({ config }) =>
    [
      '*Terms of service*',
      '',
      '• This bot is provided as-is, no warranty.',
      '• Do not use it for spam, scams or bulk messaging.',
      '• You are responsible for the account you link.',
      '• Sessions and data stay on your own host.',
      '',
      '`npm i && npm start` — that is the whole deal.',
    ].join('\n')),

  info('privacy', 'What the bot stores', ({ config }) =>
    [
      '*Privacy*',
      '',
      '• Messages are processed in memory, not logged to disk.',
      '• Group settings live in `data/groups.json` on your host.',
      '• Auth credentials live in `sessions/` (or your Supabase tables).',
      '• Nothing is sent to any third party except the APIs a command calls.',
    ].join('\n')),

  info('faq', 'Common questions', ({ config, prefix }) =>
    [
      '*FAQ*',
      '',
      `▸ *Does it need a database?* No — JSON is enough. Supabase is optional.`,
      `▸ *QR or code?* Either. \`${prefix}getsession\` explains the website flow.`,
      `▸ *Can it run on Vercel?* No — it needs a long-lived WebSocket.`,
      `▸ *How do I add a command?* Drop a file in \`plugins/\`, then \`${prefix}reload\`.`,
      `▸ *Is my number at risk?* Only if you run unknown code with your session.`,
    ].join('\n')),

  info('changelog', 'Recent changes', () => {
    const changes = [
      ['1.2.0', 'converter · image · media · moderation · info families'],
      ['1.1.0', 'small-caps menu with live stats, contact card, 40 commands'],
      ['1.0.0', 'plugin core, guards, QR / pairing code / SESSION_ID login, pairing site'],
    ];
    return ['*Changelog*', '', ...changes.map(([v, t]) => `*v${v}* — ${t}`)].join('\n');
  }),

  {
    name: 'profile',
    aliases: ['me'],
    category: 'general',
    description: 'Your profile in this chat',
    usage: '.profile',
    async run({ reply, pushName, senderJid, isGroup, isAdmin, isOwner, store, jid }) {
      const phone = bareJid(senderJid);
      const warns = isGroup ? store.get(jid, 'warns', {})[phone]?.count || 0 : 0;
      await reply({
        text: [
          '┏❐ 《 ᴘʀᴏꜰɪʟᴇ 》 ❐',
          row('name', pushName || '—'),
          row('number', phone),
          row('role', isOwner ? 'owner' : isAdmin ? 'admin' : isGroup ? 'member' : 'dm'),
          row('warnings', isGroup ? `${warns}/3` : 'n/a'),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'report',
    aliases: ['bug'],
    category: 'general',
    description: 'Report a bug to the owner',
    usage: '.report the sticker command crashes',
    cooldownMs: 60_000,
    async run({ argsText, reply, sock, config, pushName, senderJid }) {
      if (!argsText) return reply({ text: 'Usage: .report <what went wrong>' });
      const owner = `${config.ownerNumber}@s.whatsapp.net`;
      await sock.sendMessage(owner, {
        text: `🐞 *Bug report*\nfrom: ${pushName || 'unknown'} (+${bareJid(senderJid)})\n\n${argsText}`,
      }).catch(() => {});
      await reply({ text: '✅ Sent to the owner. Thanks!' });
    },
  },

  {
    name: 'suggest',
    aliases: ['request'],
    category: 'general',
    description: 'Send a feature request to the owner',
    usage: '.suggest add a spotify downloader',
    cooldownMs: 60_000,
    async run({ argsText, reply, sock, config, pushName, senderJid }) {
      if (!argsText) return reply({ text: 'Usage: .suggest <your idea>' });
      const owner = `${config.ownerNumber}@s.whatsapp.net`;
      await sock.sendMessage(owner, {
        text: `💡 *Suggestion*\nfrom: ${pushName || 'unknown'} (+${bareJid(senderJid)})\n\n${argsText}`,
      }).catch(() => {});
      await reply({ text: '✅ Suggestion sent. Nice one.' });
    },
  },

  {
    name: 'donate',
    category: 'general',
    description: 'Support the project',
    usage: '.donate',
    async run({ reply, config }) {
      await reply({
        text: `☕ *Support ${config.botName}*\n\nStar the repo, fork it, or send a PR — that is worth more than money.\n${config.repoUrl}`,
      });
    },
  },
];
