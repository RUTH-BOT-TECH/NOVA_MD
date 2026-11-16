import crypto from 'node:crypto';
import { row, sc } from '../../src/lib/ui.js';

/**
 * Clocks and quick games that need nobody else: timers that really fire, a
 * per-chat stopwatch, a trivia bank and a typing race that measures you.
 */

const frame = (title, lines) => [`┏❐ 《 ${sc(title)} 》 ❐`, ...lines, '┗❐'].join('\n');
const KEY = (name, jid) => `${name}:${jid}`;
const live = (store, name, jid) => (store.has(KEY(name, jid)) ? store.get(KEY(name, jid)) : null);
const PARSE = { s: 1000, m: 60_000, h: 3_600_000 };
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const TRIVIA = [
  { q: 'Which planet has the most moons?', a: ['Saturn', 'Jupiter', 'Uranus', 'Neptune'], i: 0 },
  { q: 'What does the HTTP status 418 mean?', a: ["I'm a teapot", 'Not found', 'Too many requests', 'Gone'], i: 0 },
  { q: 'Lagos was Nigeria’s capital until which year?', a: ['1991', '1975', '1983', '2000'], i: 0 },
  { q: 'Which language is Baileys written in?', a: ['JavaScript', 'Python', 'Go', 'Rust'], i: 0 },
  { q: 'How many keys does a standard piano have?', a: ['88', '76', '92', '64'], i: 0 },
  { q: 'What is the smallest prime number?', a: ['2', '1', '3', '0'], i: 0 },
  { q: 'Which ocean is the deepest?', a: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], i: 0 },
  { q: 'A byte is how many bits?', a: ['8', '4', '16', '32'], i: 0 },
  { q: 'Which country invented paper?', a: ['China', 'Egypt', 'Greece', 'India'], i: 0 },
  { q: 'The chemical symbol Au stands for…', a: ['Gold', 'Silver', 'Aluminium', 'Argon'], i: 0 },
];

const SENTENCES = [
  'the quick brown fox jumps over the lazy dog',
  'nova md keeps every command honest and sharp',
  'lagos traffic teaches patience to everyone',
  'a small bot with a very large command list',
  'type this line back exactly as you see it',
];

/** Shuffle answer order so the right one is not always first. */
function deal(q) {
  const order = q.a.map((text, i) => ({ text, correct: i === q.i }));
  for (let i = order.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export default [
  {
    name: 'timer',
    aliases: ['countdown'],
    category: 'tools',
    description: 'Countdown that pings the chat when it ends',
    usage: '.timer 10m tea',
    async run({ argsText, reply, sock, jid }) {
      const m = String(argsText).trim().match(/^(\d{1,4})\s*(s|m|h)?\s*(.*)$/i);
      if (!m || !m[1]) return reply({ text: 'Usage: .timer <10s|5m|2h> [label]' });
      const [, n, unit = 'm', label] = m;
      const ms = Number(n) * (PARSE[unit.toLowerCase()] || 60_000);
      if (ms < 1000) return reply({ text: '⚠️ Minimum timer is 1 second.' });
      if (ms > 24 * 3_600_000) return reply({ text: '⚠️ Max timer is 24 hours.' });

      const pretty = `${n}${unit.toLowerCase()}`;
      await reply({ text: frame('timer', [row('length', pretty), row('label', label || '—'), row('fires', new Date(Date.now() + ms).toLocaleTimeString('en-GB', { timeZone: process.env.TZ || 'Africa/Lagos' }))]) });

      setTimeout(() => {
        sock.sendMessage(jid, { text: `⏳ *Timer done* — ${pretty}${label ? `\n┃ ${label}` : ''}` }).catch(() => {});
      }, ms).unref?.();
    },
  },

  {
    name: 'stopwatch',
    aliases: ['sw'],
    category: 'tools',
    description: 'Per-chat stopwatch: start · lap · stop',
    usage: '.stopwatch start | lap | stop',
    async run({ argsText, reply, jid, store }) {
      const sub = String(argsText).trim().toLowerCase() || 'start';
      const state = live(store, 'stopwatch', jid);

      if (sub === 'start') {
        if (state) return reply({ text: `⏱️ Already running — ${((Date.now() - state.started) / 1000).toFixed(1)}s. *.stopwatch stop*` });
        store.set(KEY('stopwatch', jid), { started: Date.now(), laps: [] });
        return reply({ text: '⏱️ *Stopwatch started.* *.stopwatch lap* · *.stopwatch stop*' });
      }
      if (!state) return reply({ text: 'No stopwatch running. *.stopwatch start*' });

      const elapsed = Date.now() - state.started;
      if (sub === 'lap') {
        state.laps = [...(state.laps || []), elapsed];
        store.set(KEY('stopwatch', jid), state);
        const lines = state.laps.map((ms, i) => row(`lap ${i + 1}`, `${(ms / 1000).toFixed(2)}s`));
        return reply({ text: frame('stopwatch', [...lines, row('total', `${(elapsed / 1000).toFixed(2)}s`)]) });
      }
      if (sub === 'stop') {
        store.delete(KEY('stopwatch', jid));
        const lines = (state.laps || []).map((ms, i) => row(`lap ${i + 1}`, `${(ms / 1000).toFixed(2)}s`));
        return reply({ text: frame('stopwatch · stopped', [...lines, row('time', `${(elapsed / 1000).toFixed(2)}s`)]) });
      }
      return reply({ text: 'Sub-commands: *start*, *lap*, *stop*' });
    },
  },

  {
    name: 'trivia',
    aliases: ['quiz'],
    category: 'tools',
    description: 'One-question trivia round — answer with .trivia 1-4',
    usage: '.trivia  →  .trivia 2',
    async run({ argsText, reply, jid, store }) {
      const pick = String(argsText).trim();
      const state = live(store, 'trivia', jid);

      if (state && /^[1-4]$/.test(pick)) {
        store.delete(KEY('trivia', jid));
        const chosen = state.options[Number(pick) - 1];
        const right = state.options.find((o) => o.correct).text;
        return reply({
          text: chosen.correct
            ? `✅ *Correct* — ${right}.\n┃ streak : ${(state.streak || 0) + 1}`
            : `❌ Not quite — the answer was *${right}*.`,
        });
      }

      const q = TRIVIA[crypto.randomInt(TRIVIA.length)];
      const options = deal(q);
      store.set(KEY('trivia', jid), { options, streak: state?.streak || 0, at: Date.now() });
      return reply({
        text: [
          '┏❐ 《 ᴛʀɪᴠɪᴀ 》 ❐',
          `┃ ${q.q}`,
          ...options.map((o, i) => `┣◆ ${i + 1}. ${o.text}`),
          `┃ ${sc('reply')} : .trivia <1-4>`,
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'typerace',
    aliases: ['type'],
    category: 'tools',
    description: 'Type the line back as fast as you can',
    usage: '.typerace  →  .typerace <the line>',
    async run({ argsText, reply, jid, store }) {
      const typed = String(argsText).trim();
      const state = live(store, 'typerace', jid);

      if (!typed) {
        const line = SENTENCES[crypto.randomInt(SENTENCES.length)];
        store.set(KEY('typerace', jid), { line, started: Date.now() });
        return reply({ text: `⌨️ *Type this back:*\n\n${line}\n\n┃ then .typerace <your text>` });
      }

      if (!state) return reply({ text: 'No race running. Send *.typerace* to get a line.' });
      store.delete(KEY('typerace', jid));

      const seconds = Math.max(0.5, (Date.now() - state.started) / 1000);
      const words = state.line.split(/\s+/).length;
      const wpm = Math.round((words / seconds) * 60);
      const same = typed.toLowerCase() === state.line.toLowerCase();
      const hit = [...state.line].filter((c, i) => typed[i] === c).length;
      const accuracy = Math.round((hit / state.line.length) * 100);

      return reply({
        text: frame('typerace', [
          row('target', state.line),
          row('yours', typed),
          row('verdict', same ? '✅ exact' : '❌ mismatch'),
          row('accuracy', `${accuracy}%`),
          row('time', `${seconds.toFixed(1)}s`),
          row('speed', `${wpm} wpm`),
        ]),
      });
    },
  },
];
