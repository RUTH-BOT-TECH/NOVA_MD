import sharp from 'sharp';
import { BUILDS, convertBuffer, requireFfmpeg } from '../../src/lib/ffmpeg.js';
import { pickMedia, download, grabImage } from '../../src/lib/media-input.js';
import { formatBytes } from '../../src/lib/ytdlp.js';
import { row, sc } from '../../src/lib/ui.js';

/**
 * The workshop: container fixes, audio trims, captions burned into an image and
 * two ways to get a file off WhatsApp. Everything is computed here — sharp for
 * pictures, ffmpeg for sound and video, plain HTTP for the two uploaders.
 */

const frame = (title, lines) => [`┏❐ 《 ${sc(title)} 》 ❐`, ...lines, '┗❐'].join('\n');
const esc = (s) => String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

const MAX = 64 * 1024 * 1024;

async function grabAny(ctx, kinds = null) {
  const picked = pickMedia(ctx.msg);
  if (!picked.type) return { error: '↩️ Reply to a photo, video or audio clip.' };
  if (kinds && !kinds.includes(picked.type)) return { error: `↩️ That needs ${kinds.map((k) => k.replace('Message', '')).join(' or ')}.` };
  const buffer = await download(ctx.sock, picked.source);
  if (!buffer?.length) return { error: '❌ Could not download that file.' };
  if (buffer.length > MAX) return { error: '⚠️ 64 MB max.' };
  return { buffer, type: picked.type };
}

/** Wrap text into lines of roughly `per` characters. */
function wrap(text, per = 22) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > per && line) { lines.push(line); line = w; }
    else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

/** Top/bottom caption band, the way a meme is laid out. */
function captionSvg({ width, band, lines, position }) {
  const size = Math.round(band * 0.52);
  const startY = position === 'top' ? band * 0.62 : band * 0.62;
  return Buffer.from(
    `<svg width="${width}" height="${band}">
      <rect width="100%" height="100%" fill="black" opacity="0.62"/>
      ${lines.map((l, i) => `<text x="50%" y="${startY + i * size * 1.15}" text-anchor="middle"
        font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" font-weight="700"
        fill="#ffffff" stroke="#000000" stroke-width="${Math.max(1, size * 0.06)}"
        paint-order="stroke">${esc(l)}</text>`).join('')}
    </svg>`,
  );
}

export default [
  {
    name: 'tomp4',
    aliases: ['tovideo', 'fixvideo'],
    category: 'media',
    description: 'Re-container a video as a WhatsApp-safe mp4',
    usage: 'reply to a video with .tomp4',
    cooldownMs: 10_000,
    async run(ctx) {
      const got = await grabAny(ctx, ['videoMessage']);
      if (got.error) return ctx.reply({ text: got.error });
      await requireFfmpeg();
      const out = await convertBuffer(got.buffer, {
        args: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'],
        out: 'mp4',
      });
      await ctx.reply({ video: out, mimetype: 'video/mp4', caption: `🎬 mp4 · ${formatBytes(out.length)} (was ${formatBytes(got.buffer.length)})` });
    },
  },

  {
    name: 'tovn',
    aliases: ['tovoicenote'],
    category: 'media',
    description: 'Turn any audio or video into a voice note',
    usage: 'reply with .tovn',
    cooldownMs: 8000,
    async run(ctx) {
      const got = await grabAny(ctx, ['audioMessage', 'videoMessage']);
      if (got.error) return ctx.reply({ text: got.error });
      await requireFfmpeg();
      const { args, out } = BUILDS.tovoice();
      const buffer = await convertBuffer(got.buffer, { args, out });
      await ctx.reply({ audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true });
    },
  },

  {
    name: 'trim-audio',
    aliases: ['cutaudio', 'atrim'],
    category: 'media',
    description: 'Cut audio or video sound — .trim-audio 0:30 1:00',
    usage: 'reply with .trim-audio 0:30 1:00',
    cooldownMs: 8000,
    async run(ctx) {
      const got = await grabAny(ctx, ['audioMessage', 'videoMessage']);
      if (got.error) return ctx.reply({ text: got.error });
      await requireFfmpeg();
      const { args, out } = BUILDS.trim(ctx.args || []);
      const buffer = await convertBuffer(got.buffer, { args, out });
      await ctx.reply({ audio: buffer, mimetype: 'audio/mpeg', ptt: false });
    },
  },

  {
    name: 'rotate',
    aliases: ['straighten'],
    category: 'media',
    description: 'Rotate an image by any angle — .rotate 45',
    usage: 'reply to a photo with .rotate 45',
    cooldownMs: 2500,
    async run({ msg, sock, reply, argsText }) {
      const buffer = await grabImage(sock, msg);
      if (!buffer) return reply({ text: '↩️ Reply to a photo with .rotate <degrees>' });
      const deg = Math.round(Number(String(argsText).trim() || 90));
      if (!Number.isFinite(deg) || Math.abs(deg) > 360) return reply({ text: '⚠️ Give me an angle between -360 and 360.' });
      const out = await sharp(buffer).rotate(deg, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      await reply({ image: out, caption: `🔄 rotated ${deg}°` });
    },
  },

  {
    name: 'watermark',
    aliases: ['stamp'],
    category: 'media',
    description: 'Stamp text into the corner of an image',
    usage: 'reply to a photo with .watermark NOVA-MD',
    cooldownMs: 2500,
    async run({ msg, sock, reply, argsText }) {
      const buffer = await grabImage(sock, msg);
      if (!buffer) return reply({ text: '↩️ Reply to a photo with .watermark <text>' });
      const text = String(argsText).trim();
      if (!text) return reply({ text: 'Usage: .watermark <text>' });
      if (text.length > 60) return reply({ text: '⚠️ 60 characters max.' });

      const base = sharp(buffer).rotate();
      const { width = 800, height = 600 } = await base.metadata();
      const size = Math.max(16, Math.round(width / 26));
      const pad = Math.round(width / 40);
      const label = Buffer.from(
        `<svg width="${width}" height="${size * 2}"><text x="${width - pad}" y="${size * 1.35}" text-anchor="end"
          font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" fill="#ffffff" opacity="0.86"
          stroke="#000000" stroke-width="${Math.max(1, size * 0.07)}" paint-order="stroke">${esc(text)}</text></svg>`,
      );
      const out = await base
        .composite([{ input: label, top: height - size * 2 - pad, left: 0 }])
        .jpeg({ quality: 90 })
        .toBuffer();
      await reply({ image: out, caption: `💧 ${text}` });
    },
  },

  {
    name: 'meme',
    aliases: ['caption'],
    category: 'media',
    description: 'Top and bottom text on an image — .meme top | bottom',
    usage: 'reply to a photo with .meme when it works | when it does not',
    cooldownMs: 2500,
    async run({ msg, sock, reply, argsText }) {
      const buffer = await grabImage(sock, msg);
      if (!buffer) return reply({ text: '↩️ Reply to a photo with .meme <top> | <bottom>' });
      const [top = '', bottom = ''] = String(argsText).split('|').map((s) => s.trim());
      if (!top && !bottom) return reply({ text: 'Usage: .meme <top> | <bottom>' });

      const base = sharp(buffer).rotate();
      const meta = await base.metadata();
      const width = meta.width || 800;
      const band = Math.round(width / 5);
      const layers = [];
      if (top) layers.push({ input: captionSvg({ width, band, lines: wrap(top), position: 'top' }), top: 0, left: 0 });
      if (bottom) layers.push({ input: captionSvg({ width, band, lines: wrap(bottom), position: 'bottom' }), top: (meta.height || 600) - band, left: 0 });

      const out = await base.composite(layers).jpeg({ quality: 90 }).toBuffer();
      await reply({ image: out, caption: '🖼️ meme' });
    },
  },

  {
    name: 'tourl',
    aliases: ['upload', 'getlink'],
    category: 'media',
    description: 'Upload replied media or text and get a link (48h)',
    usage: 'reply with .tourl',
    cooldownMs: 15_000,
    async run(ctx) {
      const picked = pickMedia(ctx.msg);
      const text = String(ctx.argsText || '').trim();
      // getContentType() also names plain text ("conversation"), so check the
      // content type against the media kinds we can actually upload.
      const isMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(picked.type);

      if (!isMedia && !text) return ctx.reply({ text: '↩️ Reply to media with .tourl — or .tourl <text>' });

      if (!isMedia) {
        const res = await fetch('https://paste.rs/', { method: 'POST', body: text, headers: { 'content-type': 'text/plain' } });
        const url = (await res.text()).trim();
        if (!/^https?:\/\//.test(url)) return ctx.reply({ text: '❌ paste.rs refused that.' });
        return ctx.reply({ text: frame('tourl', [row('type', 'text'), row('chars', String(text.length)), row('link', url)]) });
      }

      const buffer = await download(ctx.sock, picked.source);
      if (!buffer?.length) return ctx.reply({ text: '❌ Could not download that file.' });
      if (buffer.length > 20 * 1024 * 1024) return ctx.reply({ text: '⚠️ 20 MB max for uploads.' });

      const ext = { imageMessage: 'jpg', videoMessage: 'mp4', audioMessage: 'ogg', stickerMessage: 'webp' }[picked.type] || 'bin';
      const form = new FormData();
      form.append('file', new Blob([buffer]), `nova-${Date.now()}.${ext}`);
      const res = await fetch('https://tmpfiles.org/api/v1/upload', { method: 'POST', body: form });
      const json = await res.json().catch(() => null);
      const page = json?.data?.url;
      if (!page) return ctx.reply({ text: '❌ The uploader refused the file — try again later.' });
      const direct = page.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      await ctx.reply({ text: frame('tourl', [row('file', formatBytes(buffer.length)), row('link', direct), row('expires', '48 hours')]) });
    },
  },

  {
    name: 'paste',
    aliases: ['bin', 'pastebin'],
    category: 'media',
    description: 'Paste text or a replied message and get a link',
    usage: '.paste <text>   ·   reply + .paste',
    cooldownMs: 10_000,
    async run({ argsText, msg, reply }) {
      const quoted = msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
        || msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;
      const body = String(quoted || argsText || '').trim();
      if (!body) return reply({ text: 'Usage: .paste <text>  (or reply to a message)' });
      if (body.length > 60_000) return reply({ text: '⚠️ 60,000 characters max.' });

      const res = await fetch('https://paste.rs/', { method: 'POST', body, headers: { 'content-type': 'text/plain' } });
      const url = (await res.text()).trim();
      if (!/^https?:\/\//.test(url)) return reply({ text: '❌ paste.rs refused that text.' });
      await reply({ text: frame('paste', [row('chars', String(body.length)), row('link', url)]) });
    },
  },
];
