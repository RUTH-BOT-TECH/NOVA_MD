import { fetchJson } from '../../src/lib/http.js';
import { row } from '../../src/lib/ui.js';

const frame = (title, lines) => [`┏❐ 《 ${title} 》 ❐`, ...lines, '┗❐'].join('\n');
const noteKey = (jid) => jid;

export default [
  {
    name: 'short',
    aliases: ['tinyurl', 'shorten'],
    category: 'misc',
    description: 'Shorten a URL',
    usage: '.short <url>',
    async run({ argsText, reply }) {
      const url = argsText.trim();
      if (!/^https?:\/\//i.test(url)) return reply({ text: 'Usage: .short <full url starting with http>' });
      const out = await fetchJson(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`)
        .catch(async () => {
          const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
          const text = await res.text();
          if (!res.ok || !/^https?:\/\//.test(text)) throw new Error('shortener refused that link');
          return text;
        });
      await reply({ text: `🔗 ${typeof out === 'string' ? out.trim() : JSON.stringify(out)}\n\n_was_\n${url}` });
    },
  },

  {
    name: 'translate',
    aliases: ['tr'],
    category: 'misc',
    description: 'Translate text (source auto-detected)',
    usage: '.translate <lang> <text>  ·  .translate <lang> (reply to text)',
    cooldownMs: 3000,
    async run({ argsText, reply, message }) {
      const [maybeLang, ...rest] = argsText.trim().split(/\s+/);
      const quoted = message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
      const lang = /^[a-z]{2}(-[A-Za-z]{2})?$/i.test(maybeLang || '') ? maybeLang.toLowerCase() : 'en';
      const text = (lang === maybeLang?.toLowerCase() ? rest.join(' ') : argsText).trim() || quotedText;
      if (!text) return reply({ text: 'Usage: .translate fr hello world  (or reply to a message)' });

      try {
      const d = await fetchJson(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 480))}&langpair=autodetect|${lang}`);
      const translated = d.responseData?.translatedText || '';
      if (d.responseStatus !== 200 || /INVALID LANGUAGE PAIR/i.test(translated)) {
        throw new Error(`Could not translate to *${lang}* — use a 2-letter code (fr, es, yo, ig, ha, ar…).`);
      }
      await reply({
        text: frame(`ᴛʀᴀɴꜱʟᴀᴛᴇ · ${lang}`, [
          row('result', translated),
          d.responseData?.detectedLanguage ? row('detected', d.responseData.detectedLanguage) : '',
          row('source', text.slice(0, 200)),
        ].filter(Boolean)),
      });
      } catch (err) {
        await reply({ text: `❌ ${err.message}` });
      }
    },
  },

  {
    name: 'remind',
    aliases: ['reminder'],
    category: 'misc',
    description: 'Set a reminder (10m, 2h, 90s)',
    usage: '.remind 10m take the chicken out',
    async run({ argsText, reply, sock, jid }) {
      const m = argsText.trim().match(/^(\d{1,4})\s*(s|m|h|d)\s+(.+)$/i);
      if (!m) return reply({ text: 'Usage: .remind <10s|5m|2h|1d> <what to remember>' });
      const [, n, unit, what] = m;
      const ms = Number(n) * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit.toLowerCase()];
      if (ms > 7 * 86_400_000) return reply({ text: '⚠️ Max reminder window is 7 days.' });
      const at = new Date(Date.now() + ms);
      await reply({ text: `⏰ Okay — I'll remind you in *${n}${unit.toLowerCase()}* (${at.toLocaleTimeString('en-GB', { timeZone: process.env.TZ || 'Africa/Lagos' })}).` });

      setTimeout(() => {
        sock.sendMessage(jid, { text: `⏰ *Reminder*\n\n${what}` }).catch(() => {});
      }, ms).unref?.();
    },
  },

  {
    name: 'note',
    aliases: ['notes'],
    category: 'misc',
    description: 'Per-chat notes: add · list · del · clear',
    usage: '.note add <text> | .note list | .note del <n>',
    async run({ argsText, reply, jid, store }) {
      const [sub = 'list', ...rest] = argsText.trim().split(/\s+/);
      const body = rest.join(' ').trim();
      const notes = store.get(noteKey(jid), 'notes', []) || [];

      if (sub === 'add' || sub === 'save') {
        if (!body) return reply({ text: 'Usage: .note add <text>' });
        if (notes.length >= 30) return reply({ text: '⚠️ 30 notes max — delete some first.' });
        const next = [...notes, { text: body, at: new Date().toISOString() }];
        store.set(noteKey(jid), { notes: next });
        return reply({ text: `📝 Saved as note #${next.length}.` });
      }

      if (sub === 'del' || sub === 'delete' || sub === 'rm') {
        const i = Number(body) - 1;
        if (!Number.isInteger(i) || !notes[i]) return reply({ text: 'Usage: .note del <number>  (see .note list)' });
        const next = notes.filter((_, x) => x !== i);
        store.set(noteKey(jid), { notes: next });
        return reply({ text: `🗑️ Deleted note #${i + 1}. ${next.length} left.` });
      }

      if (sub === 'clear') {
        store.set(noteKey(jid), { notes: [] });
        return reply({ text: '🧹 All notes cleared for this chat.' });
      }

      if (!notes.length) return reply({ text: '📭 No notes yet. Add one: .note add buy milk' });
      await reply({
        text: frame('ɴᴏᴛᴇꜱ', notes.map((n, i) => `┣◆ *${i + 1}.* ${n.text}\n     _${n.at.slice(0, 10)}_`)),
      });
    },
  },
];
