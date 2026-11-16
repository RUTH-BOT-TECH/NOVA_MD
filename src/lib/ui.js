/**
 * Rendering helpers for that clean small-caps menu look.
 * Everything is plain unicode text so it renders identically on every phone.
 */

const SMALL_CAPS = {
  a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ꜰ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ',
  k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 'ꜱ', t: 'ᴛ',
  u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ',
};

/** "owner" → "ᴏᴡɴᴇʀ" */
export const sc = (text = '') =>
  String(text).toLowerCase().replace(/[a-z]/g, (c) => SMALL_CAPS[c] || c);

/** 1_250_000 → "1.25 MB" */
export function bytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 2).replace(/\.00$/, '')} ${units[i]}`;
}

/** 3840000 → "1h 4m 0s" */
export function duration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s % 60}s`].filter(Boolean);
  return parts.slice(0, d ? 4 : 3).join(' ');
}

/** progress bar → "▰▰▰▰▰▰▱▱▱▱" */
export function bar(percent, cells = 10, filled = '█', empty = '░') {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const n = Math.round((p / 100) * cells);
  return `[${filled.repeat(n)}${empty.repeat(cells - n)}]`;
}

/** One category block, e.g. ┏❐ 《 ɢᴇɴᴇʀᴀʟ 》 ❐ / ┣◆ ᴘɪɴɢ / ┗❐ */
export function block(title, lines = [], { pad = true } = {}) {
  const head = pad ? `┏❐ 《 ${sc(title)} 》 ❐` : `┏❐ 《 ${title} 》 ❐`;
  if (!lines.length) return `${head}\n┗❐`;
  return [head, ...lines.map((l) => `┣◆ ${l}`), '┗❐'].join('\n');
}

/**
 * The bot-info header: ┏❐ ◈ NAME ◈ / ┃ ᴏᴡɴᴇʀ : … / ┗❐
 * `fields` is [[label, value], …] — labels get small-capped automatically.
 */
export function header(name, fields = [], { icon = '◈', pad = true } = {}) {
  const title = pad ? sc(name).replace(/\b\w/g, (c) => c.toUpperCase()) : name;
  const rows = fields.map(([k, v]) => `┃ ${pad ? sc(k) : k} : ${v}`);
  return [`┏❐  ${icon} ${title} ${icon}`, ...rows, '┗❐'].join('\n');
}

/** A "┃ label : value" row without the frame, for dense stats lists. */
export const row = (label, value, { pad = true } = {}) => `┃ ${pad ? sc(label) : label} : ${value}`;

export const bullet = (text) => `┣◆ ${text}`;
