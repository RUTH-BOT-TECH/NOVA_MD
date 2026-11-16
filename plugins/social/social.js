import { bareJid } from '../../src/lib/message.js';
import { row } from '../../src/lib/ui.js';

/**
 * Small social layer, persisted in the JSON store.
 * `.afk` uses a real onMessage hook: if someone pings or replies to an AFK
 * user, the bot answers for them.
 */

const AFK = (jid) => `afk:${bareJid(jid)}`;
const BDAY = (jid) => `bday:${bareJid(jid)}`;

const afkPlugin = {
  name: 'afk',
  aliases: ['brb'],
  category: 'social',
  description: 'Mark yourself away — mentions get an auto-reply',
  usage: '.afk [reason]',
  async run({ senderJid, store, argsText, reply, pushName }) {
    const reason = String(argsText || '').trim().slice(0, 120) || 'no reason given';
    store.set(AFK(senderJid), { reason, since: Date.now() });
    await reply({ text: `💤 *${pushName || 'You'}* is now AFK — _${reason}_\n_Mentions will be answered for you._` });
  },

  /** Fires on every non-command message; answers for AFK users. */
  async onMessage(ctx) {
    const info = ctx.message?.extendedTextMessage?.contextInfo
      || ctx.message?.imageMessage?.contextInfo
      || ctx.message?.videoMessage?.contextInfo;
    if (!info) return;

    const candidates = new Set();
    if (info.participant && info.quotedMessage) candidates.add(bareJid(info.participant));
    for (const mention of info.mentionedJid || []) candidates.add(bareJid(mention));
    if (!candidates.size) return;

    for (const person of candidates) {
      if (person === bareJid(ctx.senderJid)) continue;
      const state = ctx.store?.get(AFK(person));
      if (!state?.reason) continue;
      const mins = Math.max(1, Math.round((Date.now() - state.since) / 60_000));
      await ctx.reply({ text: `💤 *+${person}* is AFK (${mins}m) — _${state.reason}_` }).catch(() => {});
      break;
    }
  },
};

const backPlugin = {
  name: 'back',
  aliases: ['unafk', 'iamhere'],
  category: 'social',
  description: 'Clear your AFK status',
  usage: '.back',
  async run({ senderJid, store, reply, pushName }) {
    const state = store.get(AFK(senderJid));
    if (!state?.reason) return reply({ text: `You weren't marked AFK.` });
    store.delete(AFK(senderJid));
    const mins = Math.max(1, Math.round((Date.now() - state.since) / 60_000));
    await reply({ text: `👋 Welcome back, *${pushName || 'you'}* — away for ${mins}m.` });
  },
};

export default [
  afkPlugin,
  backPlugin,

  {
    name: 'birthday',
    aliases: ['bday', 'dob'],
    category: 'social',
    description: 'Save or show birthdays',
    usage: '.birthday 1998-04-12  ·  .birthday  ·  .birthday del',
    async run({ senderJid, store, argsText, reply, pushName }) {
      const raw = String(argsText || '').trim().toLowerCase();

      if (!raw) {
        const mine = store.get(BDAY(senderJid));
        const all = store.entries('bday:')
          .map(([k, v]) => ({ jid: k.slice(5), ...v }))
          .sort((a, b) => a.date.slice(5).localeCompare(b.date.slice(5)));

        if (!mine && !all.length) return reply({ text: 'No birthdays saved yet. Add yours: .birthday 1998-04-12' });
        const today = new Date().toISOString().slice(5, 10);
        const upcoming = all
          .map((b) => {
            const thisYear = new Date(`${new Date().getUTCFullYear()}-${b.date.slice(5)}T00:00:00Z`);
            if (thisYear < new Date(new Date().toISOString().slice(0, 10))) thisYear.setUTCFullYear(thisYear.getUTCFullYear() + 1);
            return { ...b, days: Math.ceil((thisYear - new Date(new Date().toISOString().slice(0, 10))) / 86_400_000) };
          })
          .sort((a, b) => a.days - b.days)
          .slice(0, 8);

        return reply({
          text: [
            '┏❐ 《 ʙɪʀᴛʜᴅᴀʏꜱ 》 ❐',
            mine ? row('yours', mine.date) : '',
            ...upcoming.map((b) => `┣◆ +${b.jid} — ${b.date}${b.date.slice(5) === today ? ' 🎉 today!' : ` · in ${b.days}d`}`),
            '┗❐',
          ].filter(Boolean).join('\n'),
        });
      }

      if (/^(del|delete|remove|clear)$/.test(raw)) {
        store.delete(BDAY(senderJid));
        return reply({ text: '🗑️ Birthday removed.' });
      }

      const date = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!date) return reply({ text: 'Use YYYY-MM-DD, e.g. .birthday 1998-04-12' });
      const parsed = new Date(`${raw}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) return reply({ text: 'That is not a real date.' });
      const year = Number(date[1]);
      if (year < 1900 || year > new Date().getUTCFullYear()) return reply({ text: 'Give a believable birth year.' });

      store.set(BDAY(senderJid), { date: raw, name: pushName || '', at: Date.now() });
      await reply({ text: `🎂 Saved *${pushName || 'your'}* birthday as *${raw}*.\nI'll show it in .birthday lists.` });
    },
  },
];
