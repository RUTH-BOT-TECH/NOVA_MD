import sharp from 'sharp';
import crypto from 'node:crypto';
import { row } from '../../src/lib/ui.js';

/**
 * Developer / everyday utilities. All local: no network, no keys, no stubs.
 */

const arg = (text = '') => String(text).trim();
const fail = (reply, msg) => reply({ text: `❌ ${msg}` });

export default [
  {
    name: 'color',
    aliases: ['colour', 'hex'],
    category: 'dev',
    description: 'Convert a colour and preview it',
    usage: '.color #25D366  ·  .color 37,211,102',
    cooldownMs: 3000,
    async run({ argsText, reply }) {
      const raw = arg(argsText).replace(/^#/, '');
      let r, g, b;
      if (/^[0-9a-f]{3}$/i.test(raw)) {
        [r, g, b] = [...raw].map((c) => parseInt(c + c, 16));
      } else if (/^[0-9a-f]{6}$/i.test(raw)) {
        [r, g, b] = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16));
      } else {
        const parts = raw.split(/[\s,]+/).map(Number);
        if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
          return fail(reply, 'Usage: .color #25D366  or  .color 37,211,102');
        }
        [r, g, b] = parts;
      }

      const max = Math.max(r, g, b) / 255;
      const min = Math.min(r, g, b) / 255;
      const l = (max + min) / 2;
      const d = max - min;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      let h = 0;
      if (d !== 0) {
        const rr = r / 255, gg = g / 255, bb = b / 255;
        if (max === rr) h = ((gg - bb) / d) % 6;
        else if (max === gg) h = (bb - rr) / d + 2;
        else h = (rr - gg) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
      }
      const hex = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const preview = await sharp({
        create: { width: 240, height: 120, channels: 3, background: { r, g, b } },
      }).jpeg({ quality: 90 }).toBuffer();

      await reply({
        image: preview,
        caption: [
          '┏❐ 《 ᴄᴏʟᴏᴜʀ 》 ❐',
          row('hex', hex.toUpperCase()),
          row('rgb', `rgb(${r}, ${g}, ${b})`),
          row('hsl', `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`),
          row('shade', luminance > 0.55 ? 'light — use dark text' : 'dark — use light text'),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'timestamp',
    aliases: ['ts', 'epoch'],
    category: 'dev',
    description: 'Convert between unix time and dates',
    usage: '.timestamp  ·  .timestamp 1700000000  ·  .timestamp 2026-01-31',
    async run({ argsText, reply, config }) {
      const input = arg(argsText);
      const tz = config.timezone || 'Africa/Lagos';
      const now = new Date();

      if (!input) {
        return reply({
          text: [
            '┏❐ 《 ᴛɪᴍᴇ 》 ❐',
            row('unix', String(Math.floor(now.getTime() / 1000))),
            row('ms', String(now.getTime())),
            row('iso', now.toISOString()),
            row('local', now.toLocaleString('en-GB', { timeZone: tz })),
            row('tz', tz),
            '┗❐',
          ].join('\n'),
        });
      }

      let date;
      if (/^\d{9,13}$/.test(input)) {
        date = new Date(input.length === 13 ? Number(input) : Number(input) * 1000);
      } else {
        date = new Date(input.includes('T') ? input : `${input}T00:00:00Z`);
      }
      if (Number.isNaN(date.getTime())) return fail(reply, 'Give me a unix timestamp or a date like 2026-01-31');

      const diffDays = Math.round((date.getTime() - Date.now()) / 86_400_000);
      await reply({
        text: [
          '┏❐ 《 ᴛɪᴍᴇ 》 ❐',
          row('unix', String(Math.floor(date.getTime() / 1000))),
          row('utc', date.toUTCString()),
          row('local', date.toLocaleString('en-GB', { timeZone: tz })),
          row('weekday', date.toLocaleDateString('en-GB', { weekday: 'long', timeZone: tz })),
          row('relative', diffDays === 0 ? 'today' : diffDays > 0 ? `in ${diffDays} day${diffDays === 1 ? '' : 's'}` : `${-diffDays} day${diffDays === -1 ? '' : 's'} ago`),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'json',
    aliases: ['formatjson', 'jq'],
    category: 'dev',
    description: 'Validate and pretty-print JSON',
    usage: '.json {"a":1,"b":[2,3]}',
    async run({ argsText, reply, message }) {
      const quoted = message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const input = arg(argsText) || quoted?.conversation || quoted?.extendedTextMessage?.text || '';
      if (!input) return fail(reply, 'Give me JSON to check, or reply to a message containing it.');
      try {
        const parsed = JSON.parse(input);
        const pretty = JSON.stringify(parsed, null, 2);
        const keys = typeof parsed === 'object' && parsed ? Object.keys(parsed).length : 0;
        await reply({
          text: `✅ valid JSON · ${pretty.length} chars · ${Array.isArray(parsed) ? `${parsed.length} items` : `${keys} keys`}\n\n\`\`\`\n${pretty.slice(0, 3000)}\n\`\`\``,
        });
      } catch (err) {
        const pos = err.message.match(/position (\d+)/)?.[1];
        const marker = pos ? `\n┃ near: …${input.slice(Math.max(0, Number(pos) - 30), Number(pos) + 30)}…` : '';
        await fail(reply, `Invalid JSON — ${err.message}${marker}`);
      }
    },
  },

  {
    name: 'regex',
    aliases: ['regexp'],
    category: 'dev',
    description: 'Test a regular expression against text',
    usage: '.regex /pattern/flags | text',
    async run({ argsText, reply }) {
      const raw = arg(argsText);
      const sep = raw.lastIndexOf('|');
      if (sep === -1) return fail(reply, 'Usage: .regex /\\d+/g | order 12345');
      const patternPart = raw.slice(0, sep).trim();
      const text = raw.slice(sep + 1).trim();
      const m = patternPart.match(/^\/(.*)\/([gimsuy]*)$/);
      const source = m ? m[1] : patternPart;
      const flags = m ? m[2] : '';

      let re;
      try { re = new RegExp(source, flags.includes('g') ? flags : `${flags}g`); }
      catch (err) { return fail(reply, `Bad regex — ${err.message}`); }

      const matches = [...text.matchAll(re)];
      const lines = matches.slice(0, 10).map((hit, i) =>
        `┣◆ ${i + 1}. \`${hit[0]}\` at ${hit.index}${hit.length > 1 ? ` · groups: ${hit.slice(1).map((g) => g ?? 'null').join(', ')}` : ''}`);
      await reply({
        text: [
          '┏❐ 《 ʀᴇɢᴇx 》 ❐',
          row('pattern', `/${source}/${flags}`),
          row('matches', String(matches.length)),
          ...(lines.length ? lines : ['┃ no matches']),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'jwt',
    aliases: ['decodejwt'],
    category: 'dev',
    description: 'Decode a JWT payload (no signature check)',
    usage: '.jwt <token>',
    async run({ argsText, reply }) {
      const token = arg(argsText);
      const parts = token.split('.');
      if (parts.length < 2) return fail(reply, 'That does not look like a JWT (expected 3 dot-separated parts).');
      const decode = (seg) => JSON.parse(Buffer.from(seg.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      try {
        const header = decode(parts[0]);
        const payload = decode(parts[1]);
        const exp = payload.exp ? new Date(payload.exp * 1000) : null;
        await reply({
          text: [
            '┏❐ 《 ᴊᴡᴛ 》 ❐',
            row('alg', header.alg || '—'),
            row('typ', header.typ || '—'),
            ...Object.entries(payload).slice(0, 8).map(([k, v]) => row(k, typeof v === 'object' ? JSON.stringify(v).slice(0, 60) : String(v).slice(0, 60))),
            exp ? row('expires', `${exp.toISOString()} ${exp.getTime() < Date.now() ? '(expired)' : '(valid)'}`) : '',
            '┗❐',
            '',
            '_decoded only — signature is not verified_',
          ].filter(Boolean).join('\n'),
        });
      } catch (err) {
        await fail(reply, `Could not decode: ${err.message}`);
      }
    },
  },

  {
    name: 'url',
    aliases: ['parseurl', 'urlinfo'],
    category: 'dev',
    description: 'Break a URL into its parts',
    usage: '.url https://example.com/path?a=1',
    async run({ argsText, reply }) {
      const raw = arg(argsText);
      let u;
      try { u = new URL(raw); } catch { return fail(reply, 'Include the protocol, e.g. https://example.com/path?x=1'); }
      const params = [...u.searchParams.entries()];
      await reply({
        text: [
          '┏❐ 《 ᴜʀʟ 》 ❐',
          row('protocol', u.protocol.replace(':', '')),
          row('host', u.host),
          row('path', u.pathname),
          row('query', params.length ? params.map(([k, v]) => `${k}=${v}`).join('&').slice(0, 200) : '—'),
          u.hash ? row('fragment', u.hash.slice(1)) : '',
          row('origin', u.origin),
          '┗❐',
        ].filter(Boolean).join('\n'),
      });
    },
  },

  {
    name: 'bmi',
    category: 'dev',
    description: 'Body mass index with the category',
    usage: '.bmi 70 1.75   (kg, metres)',
    async run({ argsText, reply }) {
      const [kg, m] = arg(argsText).split(/[\s,]+/).map(Number);
      if (!kg || !m || kg <= 0 || m <= 0) return fail(reply, 'Usage: .bmi <kg> <metres>  e.g. .bmi 70 1.75');
      const bmi = kg / (m * m);
      const band = bmi < 18.5 ? 'underweight' : bmi < 25 ? 'normal weight' : bmi < 30 ? 'overweight' : 'obese';
      await reply({
        text: [
          '┏❐ 《 ʙᴍɪ 》 ❐',
          row('weight', `${kg} kg`),
          row('height', `${m} m`),
          row('bmi', bmi.toFixed(1)),
          row('band', band),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'age',
    aliases: ['howold'],
    category: 'dev',
    description: 'Exact age from a birth date',
    usage: '.age 1998-04-12',
    async run({ argsText, reply }) {
      const raw = arg(argsText);
      const born = new Date(`${raw}T00:00:00Z`);
      if (Number.isNaN(born.getTime())) return fail(reply, 'Usage: .age 1998-04-12 (YYYY-MM-DD)');
      const now = new Date();
      if (born > now) return fail(reply, 'That date is in the future.');

      let years = now.getUTCFullYear() - born.getUTCFullYear();
      let months = now.getUTCMonth() - born.getUTCMonth();
      let days = now.getUTCDate() - born.getUTCDate();
      if (days < 0) { months--; days += new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)).getUTCDate(); }
      if (months < 0) { years--; months += 12; }
      const totalDays = Math.floor((now - born) / 86_400_000);
      const next = new Date(Date.UTC(now.getUTCFullYear(), born.getUTCMonth(), born.getUTCDate()));
      if (next < now) next.setUTCFullYear(next.getUTCFullYear() + 1);
      const toNext = Math.ceil((next - now) / 86_400_000);

      await reply({
        text: [
          '┏❐ 《 ᴀɢᴇ 》 ❐',
          row('born', raw),
          row('age', `${years}y ${months}m ${days}d`),
          row('days', totalDays.toLocaleString()),
          row('next bday', `${toNext} day${toNext === 1 ? '' : 's'}`),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'rand',
    aliases: ['randomnum'],
    category: 'dev',
    description: 'Cryptographically random number',
    usage: '.rand  ·  .rand 1 100',
    async run({ argsText, reply }) {
      const [min, max] = (arg(argsText) || '1 100').split(/[\s,]+/).map(Number);
      const lo = Number.isFinite(min) ? Math.ceil(min) : 1;
      const hi = Number.isFinite(max) ? Math.floor(max) : 100;
      if (hi <= lo) return fail(reply, 'Give a higher max, e.g. .rand 1 100');
      const value = crypto.randomInt(lo, hi + 1);
      await reply({ text: `🎲 *${value}*\n_${lo}–${hi} · crypto.randomInt_` });
    },
  },

  {
    name: 'entropy',
    aliases: ['passcheck'],
    category: 'dev',
    description: 'Estimate password strength',
    usage: '.entropy <password>',
    async run({ argsText, reply, message }) {
      const quoted = message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const pass = arg(argsText) || quoted?.conversation || '';
      if (!pass) return fail(reply, 'Usage: .entropy <password>  (or reply to a message with it)');
      let pool = 0;
      if (/[a-z]/.test(pass)) pool += 26;
      if (/[A-Z]/.test(pass)) pool += 26;
      if (/\d/.test(pass)) pool += 10;
      if (/[^A-Za-z0-9]/.test(pass)) pool += 33;
      const bits = pass.length * Math.log2(pool || 1);
      const crack = bits < 40 ? 'minutes' : bits < 60 ? 'days' : bits < 80 ? 'years' : 'centuries';
      await reply({
        text: [
          '┏❐ 《 ꜱᴛʀᴇɴɢᴛʜ 》 ❐',
          row('length', String(pass.length)),
          row('charset', String(pool)),
          row('entropy', `${bits.toFixed(1)} bits`),
          row('guess time', crack),
          row('verdict', bits < 40 ? 'weak' : bits < 60 ? 'fair' : bits < 80 ? 'strong' : 'very strong'),
          '┗❐',
        ].join('\n'),
      });
    },
  },
];
