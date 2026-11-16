const textOf = (argsText) => String(argsText || '').trim();

const cipher = (name, description, fn, aliases = []) => ({
  name,
  aliases,
  category: 'text',
  description,
  usage: `.${name} <text>`,
  async run({ argsText, reply, prefix, command }) {
    const input = textOf(argsText);
    if (!input) return reply({ text: `Usage: ${prefix}${command} <text>` });
    const out = fn(input);
    await reply({ text: out.length > 3500 ? `${out.slice(0, 3500)}…` : out });
  },
});

const rot = (text, shift) => {
  const s = ((shift % 26) + 26) % 26;
  return [...text].map((ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) return String.fromCharCode(((c - 65 + s) % 26) + 65);
    if (c >= 97 && c <= 122) return String.fromCharCode(((c - 97 + s) % 26) + 97);
    return ch;
  }).join('');
};

const MORSE = {
  a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---',
  k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-',
  u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...',
  8: '---..', 9: '----.', '.': '.-.-.-', ',': '--..--', '?': '..--..', '!': '-.-.--', "'": '.----.',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', '=': '-...-', '+': '.-.-.',
  '-': '-....-', '"': '.-..-.', '@': '.--.-.',
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

const toMorse = (t) =>
  [...t.toLowerCase()].map((c) => (c === ' ' ? '/' : MORSE[c] || '')).filter(Boolean).join(' ');

const fromMorse = (t) =>
  t.trim().split(/\s+/).map((code) => (code === '/' ? ' ' : MORSE_REV[code] || '?')).join('');

const ATBASH = (t) => [...t].map((ch) => {
  const c = ch.charCodeAt(0);
  if (c >= 65 && c <= 90) return String.fromCharCode(90 - (c - 65));
  if (c >= 97 && c <= 122) return String.fromCharCode(122 - (c - 97));
  return ch;
}).join('');

const WIDE = (t) => [...t].map((ch) => {
  const c = ch.codePointAt(0);
  if (c >= 33 && c <= 126) return String.fromCodePoint(c + 0xfee0);
  return ch === ' ' ? '\u3000' : ch;
}).join('');

export default [
  cipher('rot13', 'ROT13 cipher', (t) => rot(t, 13)),
  cipher('atbash', 'Atbash cipher (a↔z)', ATBASH),
  cipher('reverse', 'Reverse the characters', (t) => [...t].reverse().join(''), ['rev']),
  cipher('mock', 'sPoNgEbOb mock case', (t) => [...t].map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join('')),
  cipher('vaporwave', 'Ｆｕｌｌ－ｗｉｄｔｈ ｖａｐｏｒｗａｖｅ text', WIDE, ['aesthetic']),
  cipher('morse', 'Text → Morse code', toMorse),
  cipher('unmorse', 'Morse code → text', fromMorse),
  cipher('spoiler', 'Wrap text in a WhatsApp spoiler', (t) => `|| ${t} ||`),
  cipher('readmore', '"Read more" trick — hides the rest behind the button', (t) => `${t}\n${'\u200E'.repeat(2000)}`),
  cipher('bigtext', 'Spoiler-free big block', (t) => `*${t}*`),
  // caesar needs a shift argument, so it gets its own handler
  {
    name: 'caesar',
    aliases: ['shift'],
    category: 'text',
    description: 'Caesar shift — .caesar <n> <text>',
    usage: '.caesar 3 hello',
    async run({ args, argsText, reply }) {
      const shift = parseInt(args[0], 10);
      const body = argsText.replace(/^\S+\s*/, '').trim();
      if (!Number.isFinite(shift) || !body) return reply({ text: 'Usage: .caesar 3 hello world' });
      await reply({ text: `🔐 shift ${shift}\n${rot(body, shift)}` });
    },
  },
];
