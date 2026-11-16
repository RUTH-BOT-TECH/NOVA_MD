import crypto from 'node:crypto';
import { row, sc } from '../../src/lib/ui.js';

/**
 * Codes, ciphers and sky maths — everything here is computed locally, so the
 * answers never depend on a third-party API being awake.
 */

const frame = (title, lines) => [`┏❐ 《 ${sc(title)} 》 ❐`, ...lines, '┗❐'].join('\n');

/* AES-256-GCM with a key derived from the bot secret, so .encrypt and .decrypt
 * in the same deployment always agree. */
const secretKey = () =>
  crypto.createHash('sha256').update(process.env.BOT_SECRET || process.env.SESSION_ID?.slice(0, 32) || 'nova-md-local-key').digest();

function seal(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const body = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}

function open(payload) {
  const [v, iv, tag, body] = String(payload).trim().split('.');
  if (v !== 'v1' || !iv || !tag || !body) throw new Error('That is not a NOVA-MD payload.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}

/* Vigenère keeps letters only; punctuation and case survive untouched. */
function vigenere(text, key, decode = false) {
  const letters = key.toLowerCase().replace(/[^a-z]/g, '');
  if (!letters) throw new Error('The key needs at least one letter.');
  let i = 0;
  return [...text].map((ch) => {
    const lower = ch.toLowerCase();
    if (lower < 'a' || lower > 'z') return ch;
    const shift = letters.charCodeAt(i++ % letters.length) - 97;
    const base = ch === lower ? 97 : 65;
    const offset = (ch.charCodeAt(0) - base + (decode ? -shift : shift) + 26) % 26;
    return String.fromCharCode(base + offset);
  }).join('');
}

const NATO = { a: 'Alfa', b: 'Bravo', c: 'Charlie', d: 'Delta', e: 'Echo', f: 'Foxtrot', g: 'Golf', h: 'Hotel', i: 'India', j: 'Juliett', k: 'Kilo', l: 'Lima', m: 'Mike', n: 'November', o: 'Oscar', p: 'Papa', q: 'Quebec', r: 'Romeo', s: 'Sierra', t: 'Tango', u: 'Uniform', v: 'Victor', w: 'Whiskey', x: 'Xray', y: 'Yankee', z: 'Zulu' };
const DIGITS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

const toRad = (d) => (d * Math.PI) / 180;
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371.0088;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

/* Synodic-month maths — same numbers a planetarium uses, no ephemeris table. */
function moon(date = new Date()) {
  const synodic = 29.530588853;
  const known = Date.UTC(2000, 0, 6, 18, 14); // a known new moon
  const days = (date.getTime() - known) / 86_400_000;
  const age = ((days % synodic) + synodic) % synodic;
  const phase = age / synodic;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * phase)) * 50);
  const names = [
    [0.0339, 'New moon', '🌑'], [0.2166, 'Waxing crescent', '🌒'], [0.2833, 'First quarter', '🌓'],
    [0.4666, 'Waxing gibbous', '🌔'], [0.5333, 'Full moon', '🌕'], [0.7166, 'Waning gibbous', '🌖'],
    [0.7833, 'Last quarter', '🌗'], [0.9666, 'Waning crescent', '🌘'], [1.0001, 'New moon', '🌑'],
  ];
  const [, name, emoji] = names.find(([limit]) => phase < limit);
  return { age: age.toFixed(1), illumination, name, emoji };
}

const SIGNS = [
  ['Capricorn', 'Dec 22 – Jan 19', 'Earth', '♑', 12, 22], ['Aquarius', 'Jan 20 – Feb 18', 'Air', '♒', 1, 20],
  ['Pisces', 'Feb 19 – Mar 20', 'Water', '♓', 2, 19], ['Aries', 'Mar 21 – Apr 19', 'Fire', '♈', 3, 21],
  ['Taurus', 'Apr 20 – May 20', 'Earth', '♉', 4, 20], ['Gemini', 'May 21 – Jun 20', 'Air', '♊', 5, 21],
  ['Cancer', 'Jun 21 – Jul 22', 'Water', '♋', 6, 21], ['Leo', 'Jul 23 – Aug 22', 'Fire', '♌', 7, 23],
  ['Virgo', 'Aug 23 – Sep 22', 'Earth', '♍', 8, 23], ['Libra', 'Sep 23 – Oct 22', 'Air', '♎', 9, 23],
  ['Scorpio', 'Oct 23 – Nov 21', 'Water', '♏', 10, 23], ['Sagittarius', 'Nov 22 – Dec 21', 'Fire', '♐', 11, 22],
];

function zodiacSign({ month, day }) {
  // walk backwards from Capricorn so January lands correctly
  const ordered = [[12, 22], [1, 20], [2, 19], [3, 21], [4, 20], [5, 21], [6, 21], [7, 23], [8, 23], [9, 23], [10, 23], [11, 22]];
  let index = 0;
  for (let i = 0; i < ordered.length; i++) {
    const [m, d] = ordered[i];
    if (month > m || (month === m && day >= d)) index = i;
  }
  if (month === 12 && day >= 22) index = 0;
  return SIGNS[index];
}

const TAROT = [
  ['The Fool', 'a beginning no one has planned for'], ['The Magician', 'the tools are already in your hands'],
  ['The High Priestess', 'what you know but have not said'], ['The Empress', 'something worth growing'],
  ['The Emperor', 'a boundary that needs drawing'], ['The Hierophant', 'a rule worth questioning'],
  ['The Lovers', 'a choice between two goods'], ['The Chariot', 'momentum you have to steer'],
  ['Strength', 'patience doing the work force cannot'], ['The Hermit', 'time alone, on purpose'],
  ['Wheel of Fortune', 'a turn you did not cause'], ['Justice', 'the account gets balanced'],
  ['The Hanged Man', 'the pause that changes the question'], ['Death', 'an ending that clears space'],
  ['Temperance', 'the middle path, mixed carefully'], ['The Devil', 'a bargain you can renegotiate'],
  ['The Tower', 'the thing that falls was already cracked'], ['The Star', 'hope, quietly earned'],
  ['The Moon', 'the part of the map that is fog'], ['The Sun', 'clarity, and the nerve to use it'],
  ['Judgement', 'a call you have been avoiding'], ['The World', 'the loop closes'],
];

export default [
  {
    name: 'encrypt',
    aliases: ['seal'],
    category: 'tools',
    description: 'Encrypt text with AES-256-GCM',
    usage: '.encrypt <text>',
    async run({ argsText, reply }) {
      const text = String(argsText).trim();
      if (!text) return reply({ text: 'Usage: .encrypt <text>' });
      if (text.length > 2000) return reply({ text: '⚠️ 2,000 characters max.' });
      const payload = seal(text);
      await reply({ text: frame('encrypt', [row('input', `${text.length} chars`), row('payload', payload.slice(0, 200)), `┃ ${sc('note')} : only this bot can open it`]) });
    },
  },

  {
    name: 'decrypt',
    aliases: ['unseal'],
    category: 'tools',
    description: 'Open a payload made by .encrypt',
    usage: '.decrypt <payload>',
    async run({ argsText, reply }) {
      const payload = String(argsText).trim();
      if (!payload) return reply({ text: 'Usage: .decrypt <payload>' });
      try {
        const text = open(payload);
        await reply({ text: frame('decrypt', [row('plain', text.slice(0, 3000)), row('bytes', Buffer.byteLength(text))]) });
      } catch (err) {
        await reply({ text: `❌ ${err.message.includes('unable') ? 'Wrong key or tampered payload.' : err.message}` });
      }
    },
  },

  {
    name: 'vigenere',
    aliases: ['vig'],
    category: 'tools',
    description: 'Vigenère cipher — .vigenere <key> <text>  ·  add -d to decode',
    usage: '.vigenere lemon attack at dawn',
    async run({ argsText, reply }) {
      const raw = String(argsText).trim();
      const decode = /^-d\s+|^--decode\s+/.test(raw);
      const body = raw.replace(/^-d\s+|^--decode\s+/, '');
      const [key, ...rest] = body.split(/\s+/);
      const text = rest.join(' ');
      if (!key || !text) return reply({ text: 'Usage: .vigenere <key> <text>   ·   add -d to decode' });
      try {
        const out = vigenere(text, key, decode);
        await reply({ text: frame(decode ? 'vigenere · decode' : 'vigenere · encode', [row('key', key), row('result', out.slice(0, 3000))]) });
      } catch (err) {
        await reply({ text: `❌ ${err.message}` });
      }
    },
  },

  {
    name: 'phonetic',
    aliases: ['nato', 'spellout'],
    category: 'tools',
    description: 'Spell text out in the NATO alphabet',
    usage: '.phonetic NOVA42',
    async run({ argsText, reply }) {
      const text = String(argsText).trim();
      if (!text) return reply({ text: 'Usage: .phonetic <text>' });
      if (text.length > 120) return reply({ text: '⚠️ 120 characters max.' });
      const words = [...text.toUpperCase()].map((ch) => NATO[ch.toLowerCase()] || DIGITS[Number(ch)] || (ch === ' ' ? '·' : ch)).filter(Boolean);
      await reply({ text: frame('phonetic', [`┃ ${words.join(' · ')}`]) });
    },
  },

  {
    name: 'distance',
    aliases: ['haversine', 'howfar'],
    category: 'tools',
    description: 'Great-circle distance between two coordinates',
    usage: '.distance 6.5244,3.3792 9.0765,7.3986',
    async run({ argsText, reply }) {
      const nums = String(argsText).match(/-?\d+(\.\d+)?/g) || [];
      if (nums.length < 4) return reply({ text: 'Usage: .distance <lat1,lon1> <lat2,lon2>  e.g. .distance 6.52,3.37 9.07,7.39' });
      const [lat1, lon1, lat2, lon2] = nums.slice(0, 4).map(Number);
      if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
        return reply({ text: '⚠️ Latitude runs -90…90 and longitude -180…180.' });
      }
      const km = haversine(lat1, lon1, lat2, lon2);
      await reply({
        text: frame('distance', [
          row('from', `${lat1}, ${lon1}`),
          row('to', `${lat2}, ${lon2}`),
          row('km', km.toFixed(1)),
          row('miles', (km * 0.621371).toFixed(1)),
          row('nautical', (km / 1.852).toFixed(1)),
        ]),
      });
    },
  },

  {
    name: 'moonphase',
    aliases: ['moon'],
    category: 'tools',
    description: "Tonight's moon phase and illumination",
    usage: '.moonphase [YYYY-MM-DD]',
    async run({ argsText, reply }) {
      const arg = String(argsText).trim();
      const date = arg ? new Date(`${arg}T21:00:00Z`) : new Date();
      if (Number.isNaN(date.getTime())) return reply({ text: 'Usage: .moonphase [YYYY-MM-DD]' });
      const m = moon(date);
      await reply({
        text: frame('moon', [
          row('date', date.toISOString().slice(0, 10)),
          row('phase', `${m.emoji} ${m.name}`),
          row('illumination', `${m.illumination}%`),
          row('age', `${m.age} days`),
        ]),
      });
    },
  },

  {
    name: 'zodiac',
    aliases: ['starsign', 'horoscope-sun'],
    category: 'tools',
    description: 'Sun sign for a date',
    usage: '.zodiac 1998-07-24',
    async run({ argsText, reply }) {
      const arg = String(argsText).trim();
      const m = arg.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (!m) return reply({ text: 'Usage: .zodiac YYYY-MM-DD  e.g. .zodiac 1998-07-24' });
      const month = Number(m[2]);
      const day = Number(m[3]);
      if (month < 1 || month > 12 || day < 1 || day > 31) return reply({ text: '⚠️ That date does not exist.' });
      const [name, range, element, glyph] = zodiacSign({ month, day });
      await reply({
        text: frame('zodiac', [row('date', `${m[3]}/${m[2]}`), row('sign', `${glyph} ${name}`), row('window', range), row('element', element)]),
      });
    },
  },

  {
    name: 'tarot',
    category: 'tools',
    description: 'Draw a three-card tarot spread',
    usage: '.tarot',
    async run({ reply }) {
      const picked = crypto.randomInt(TAROT.length);
      const past = crypto.randomInt(TAROT.length);
      const future = crypto.randomInt(TAROT.length);
      const line = ([name, note], label, reversed) => `┣◆ *${label}* — ${name}${reversed ? ' (reversed)' : ''}\n┃   ${note}`;
      await reply({
        text: [
          '┏❐ 《 ᴛᴀʀᴏᴛ 》 ❐',
          line(TAROT[past], 'what led here', crypto.randomInt(2) === 1),
          line(TAROT[picked], 'where you are', crypto.randomInt(2) === 1),
          line(TAROT[future], 'what comes next', crypto.randomInt(2) === 1),
          '┗❐',
        ].join('\n'),
      });
    },
  },
];
