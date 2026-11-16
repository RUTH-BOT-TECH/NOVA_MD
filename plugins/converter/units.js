const round = (n, dp = 4) => Number(Number(n).toFixed(dp)).toString();
const firstNumber = (args) => {
  const v = parseFloat(String(args?.[0] ?? '').replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
};

/** One conversion command. fn(value) → { out, label } */
const unit = (name, description, fn, aliases = []) => ({
  name,
  aliases,
  category: 'converter',
  description,
  usage: `.${name} <value>`,
  async run({ args, reply, prefix, command }) {
    const value = firstNumber(args);
    if (value === null) return reply({ text: `Usage: ${prefix}${command} <value>` });
    const { out, label } = fn(value);
    await reply({ text: `📐 *${command}*\n${value} → *${out}*${label ? ` ${label}` : ''}` });
  },
});

// ── length ─────────────────────────────────────────────────────────────
const len = [
  unit('cm2inch', 'Centimetres → inches', (v) => ({ out: round(v / 2.54), label: 'in' }), ['inch']),
  unit('inch2cm', 'Inches → centimetres', (v) => ({ out: round(v * 2.54), label: 'cm' })),
  unit('km2miles', 'Kilometres → miles', (v) => ({ out: round(v * 0.621371), label: 'mi' }), ['km2mi']),
  unit('miles2km', 'Miles → kilometres', (v) => ({ out: round(v * 1.609344), label: 'km' }), ['mi2km']),
  unit('m2ft', 'Metres → feet', (v) => ({ out: round(v * 3.28084), label: 'ft' })),
  unit('ft2m', 'Feet → metres', (v) => ({ out: round(v / 3.28084), label: 'm' })),
];

// ── mass ───────────────────────────────────────────────────────────────
const mass = [
  unit('kg2lbs', 'Kilograms → pounds', (v) => ({ out: round(v * 2.2046226), label: 'lb' })),
  unit('lbs2kg', 'Pounds → kilograms', (v) => ({ out: round(v / 2.2046226), label: 'kg' })),
  unit('g2oz', 'Grams → ounces', (v) => ({ out: round(v / 28.3495), label: 'oz' })),
  unit('oz2g', 'Ounces → grams', (v) => ({ out: round(v * 28.3495), label: 'g' })),
  unit('ton2kg', 'Metric tons → kilograms', (v) => ({ out: round(v * 1000), label: 'kg' })),
];

// ── temperature ────────────────────────────────────────────────────────
const temp = [
  unit('celsius', 'Celsius → Fahrenheit', (v) => ({ out: round((v * 9) / 5 + 32), label: '°F' }), ['c2f']),
  unit('fahrenheit', 'Fahrenheit → Celsius', (v) => ({ out: round(((v - 32) * 5) / 9), label: '°C' }), ['f2c']),
  unit('kelvin', 'Celsius → Kelvin', (v) => ({ out: round(v + 273.15), label: 'K' })),
];

// ── numbers & bases ────────────────────────────────────────────────────
const binDigits = (args) => String(args?.[0] ?? '').trim();
const textOf = (argsText) => String(argsText || '').trim();

const bases = [
  unit('dec2bin', 'Decimal → binary', (v) => ({ out: Math.trunc(v).toString(2) })),
  unit('dec2hex', 'Decimal → hexadecimal', (v) => ({ out: Math.trunc(v).toString(16).toUpperCase() })),
  unit('dec2oct', 'Decimal → octal', (v) => ({ out: Math.trunc(v).toString(8) }), ['octal']),
  unit('bin2dec', 'Binary → decimal', (v) => ({ out: parseInt(String(v), 2) })),
  unit('hex2dec', 'Hexadecimal → decimal', (v) => ({ out: parseInt(String(v), 16) })),
];

// text ↔ binary / hex (argument based, not numeric)
const textBase = (name, description, fn, aliases = []) => ({
  name,
  aliases,
  category: 'converter',
  description,
  usage: `.${name} <text>`,
  async run({ argsText, reply, prefix, command }) {
    const input = textOf(argsText);
    if (!input) return reply({ text: `Usage: ${prefix}${command} <text or values>` });
    try {
      await reply({ text: '```' + fn(input) + '```' });
    } catch {
      await reply({ text: '❌ That input could not be converted.' });
    }
  },
});

const textOps = [
  textBase('text2binary', 'Text → binary', (t) => [...t].map((c) => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' '), ['binary']),
  textBase('binary2text', 'Binary → text', (t) =>
    t.split(/\s+/).filter(Boolean).map((b) => String.fromCharCode(parseInt(b, 2))).join('')),
  textBase('text2hex', 'Text → hexadecimal', (t) => Buffer.from(t, 'utf8').toString('hex').toUpperCase()),
  textBase('hex2text', 'Hexadecimal → text', (t) =>
    Buffer.from(t.replace(/\s+/g, ''), 'hex').toString('utf8')),
  textBase('base64enc', 'Text → base64', (t) => Buffer.from(t, 'utf8').toString('base64'), ['b64enc']),
  textBase('base64dec', 'Base64 → text', (t) => Buffer.from(t, 'base64').toString('utf8'), ['b64dec']),
];

// ── roman numerals & words ─────────────────────────────────────────────
const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

export function toRoman(n) {
  let num = Math.trunc(n);
  if (num <= 0 || num > 3999) throw new Error('out of range');
  let out = '';
  for (const [v, s] of ROMAN) while (num >= v) { out += s; num -= v; }
  return out;
}

export function fromRoman(str) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const s = String(str).toUpperCase();
  if (!/^[IVXLCDM]+$/.test(s)) throw new Error('not roman');
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = map[s[i]];
    const next = map[s[i + 1]];
    total += next > cur ? -cur : cur;
  }
  return total;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

export function numberToWords(n) {
  const num = Math.trunc(Math.abs(n));
  if (num === 0) return 'zero';
  const chunk = (x) => {
    let s = '';
    if (x >= 100) { s += `${ONES[Math.floor(x / 100)]} hundred`; x %= 100; if (x) s += ' '; }
    if (x >= 20) { s += TENS[Math.floor(x / 10)]; if (x % 10) s += `-${ONES[x % 10]}`; }
    else if (x > 0) s += ONES[x];
    return s;
  };
  const parts = [];
  let rest = num;
  for (const [size, label] of [[1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']]) {
    if (rest >= size) { parts.push(`${chunk(Math.floor(rest / size))} ${label}`); rest %= size; }
  }
  if (rest) parts.push(chunk(rest));
  return (n < 0 ? 'minus ' : '') + parts.join(' ');
}

const misc = [
  {
    name: 'num2roman', aliases: ['toroman'], category: 'converter',
    description: 'Arabic number → Roman numeral', usage: '.num2roman 1994',
    async run({ args, reply, prefix, command }) {
      const v = firstNumber(args);
      if (v === null) return reply({ text: `Usage: ${prefix}${command} 1994` });
      try { await reply({ text: `🏛️ ${Math.trunc(v)} → *${toRoman(v)}*` }); }
      catch { await reply({ text: '❌ Roman numerals only cover 1–3999.' }); }
    },
  },
  {
    name: 'roman2num', aliases: ['fromroman'], category: 'converter',
    description: 'Roman numeral → Arabic number', usage: '.roman2num MCMXCIV',
    async run({ args, reply, prefix, command }) {
      const v = String(args?.[0] || '');
      if (!v) return reply({ text: `Usage: ${prefix}${command} MCMXCIV` });
      try { await reply({ text: `🏛️ ${v.toUpperCase()} → *${fromRoman(v)}*` }); }
      catch { await reply({ text: '❌ That is not a Roman numeral.' }); }
    },
  },
  {
    name: 'number2words', aliases: ['words'], category: 'converter',
    description: 'Number → English words', usage: '.number2words 1250',
    async run({ args, reply, prefix, command }) {
      const v = firstNumber(args);
      if (v === null) return reply({ text: `Usage: ${prefix}${command} 1250` });
      await reply({ text: `🔢 ${v} → *${numberToWords(v)}*` });
    },
  },
  {
    name: 'datasize', aliases: ['bytes'], category: 'converter',
    description: 'Bytes → human readable size', usage: '.datasize 1048576',
    async run({ args, reply, prefix, command }) {
      const v = firstNumber(args);
      if (v === null) return reply({ text: `Usage: ${prefix}${command} 1048576` });
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.min(Math.floor(Math.log(Math.max(v, 1)) / Math.log(1024)), units.length - 1);
      await reply({ text: `💾 ${v} bytes = *${round(v / 1024 ** i, 2)} ${units[i]}*` });
    },
  },
];

export default [...len, ...mass, ...temp, ...bases, ...textOps, ...misc];
