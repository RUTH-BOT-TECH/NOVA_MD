import sharp from 'sharp';
import { grabImage } from '../../src/lib/media-input.js';

/** One image command. `apply(sharp, args, buffer)` returns a pipeline. */
/** Apply one named op to a buffer — used by run() and by the test harness. */
export async function applyOp(name, buffer, args = []) {
  const plugin = ops.find((p) => p.name === name);
  if (!plugin) throw new Error(`unknown op ${name}`);
  const apply = plugin.__apply;
  let img = sharp(buffer).rotate();
  img = apply(img, args, buffer) || img;
  return plugin.__format === 'png' ? img.png().toBuffer() : img.jpeg({ quality: 88 }).toBuffer();
}

const imageOp = (name, description, apply, { aliases = [], format = 'jpeg' } = {}) => ({
  name,
  aliases,
  category: 'image',
  description,
  usage: `reply to an image with .${name}`,
  cooldownMs: 2500,
  __apply: apply,
  __format: format,
  async run({ msg, sock, reply, args }) {
    const buffer = await grabImage(sock, msg);
    if (!buffer) return reply({ text: `↩️ Reply to an image (or send one) with .${name}` });
    const out = await applyOp(name, buffer, args);
    await reply({ image: out, caption: `✨ *${name}*` });
  },
});

const EMBOSS = [-2, -1, 0, -1, 1, 1, 0, 1, 2];
const EDGES = [0, -1, 0, -1, 4, -1, 0, -1, 0];
// sharp's recomb() wants a nested 3x3
const SEPIA = [[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]];
const CHROMA = [[1.18, 0.02, 0], [0, 0.94, 0.02], [0.02, 0, 0.86]];
const W = 512;

const circleMask = (s) => Buffer.from(
  `<svg width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}" fill="#fff"/></svg>`
);

const vignetteMask = (s) => Buffer.from(
  `<svg width="${s}" height="${s}">
     <defs><radialGradient id="v" cx="50%" cy="50%" r="72%">
       <stop offset="55%" stop-color="#000" stop-opacity="0"/>
       <stop offset="100%" stop-color="#000" stop-opacity="0.85"/>
     </radialGradient></defs>
     <rect width="${s}" height="${s}" fill="url(#v)"/>
   </svg>`
);

const ops = [
  imageOp('blur', 'Gaussian blur', (s) => s.blur(12)),
  imageOp('brighten', 'Raise brightness', (s) => s.modulate({ brightness: 1.45 })),
  imageOp('darken', 'Lower brightness', (s) => s.modulate({ brightness: 0.62 })),
  imageOp('contrast', 'Increase contrast', (s) => s.linear(1.4, -40)),
  imageOp('saturate', 'Punch the colours', (s) => s.modulate({ saturation: 1.9 })),
  imageOp('desaturate', 'Drain the colours', (s) => s.modulate({ saturation: 0.25 })),
  imageOp('grayscale', 'Black and white', (s) => s.grayscale(), { aliases: ['gray', 'bw'] }),
  imageOp('invert', 'Invert colours', (s) => s.negate()),
  imageOp('sepia', 'Warm sepia tone', (s) => s.recomb(SEPIA)),
  imageOp('sharpen', 'Sharpen details', (s) => s.sharpen({ sigma: 1.6 })),
  imageOp('emboss', 'Emboss filter', (s) => s.convolve({ width: 3, height: 3, kernel: EMBOSS })),
  imageOp('edges', 'Edge detect', (s) => s.grayscale().convolve({ width: 3, height: 3, kernel: EDGES }), { aliases: ['edge'] }),
  imageOp('pixelate', 'Pixelate', (s) => s.resize(W / 16, null, { fit: 'inside' }).resize(W, null, { fit: 'inside', kernel: 'nearest' })),
  imageOp('compress', 'Crush the file size', (s) => s.jpeg({ quality: 32 }), { format: 'jpeg' }),
  imageOp('rotate90', 'Rotate 90°', (s) => s.rotate(90)),
  imageOp('rotate180', 'Rotate 180°', (s) => s.rotate(180)),
  imageOp('rotate270', 'Rotate 270°', (s) => s.rotate(270)),
  imageOp('mirror', 'Mirror horizontally', (s) => s.flop()),
  imageOp('vflip', 'Flip vertically', (s) => s.flip(), { aliases: ['flip'] }),
  imageOp('circle', 'Crop into a circle', (s) => s.resize(W, W, { fit: 'cover' })
    .composite([{ input: circleMask(W), blend: 'dest-in' }]), { format: 'png' }),
  imageOp('vignette', 'Darken the edges', (s) => s.resize(W, W, { fit: 'cover' })
    .composite([{ input: vignetteMask(W), blend: 'over' }])),
  imageOp('oldfilm', 'Aged film look', (s) => s.recomb(SEPIA).modulate({ brightness: 0.95, saturation: 0.7 })
    .composite([{ input: vignetteMask(W), blend: 'over' }])),
  imageOp('deepfry', 'Deep-fried meme', (s) => s.modulate({ saturation: 3, brightness: 1.15 })
    .sharpen({ sigma: 2.2 }).linear(1.5, -60)),
  imageOp('glitch', 'Chromatic glitch', (s) => s.recomb(CHROMA).sharpen({ sigma: 1.2 }).modulate({ saturation: 1.3 })),
  {
    name: 'resize',
    aliases: ['scale'],
    category: 'image',
    description: 'Resize an image — .resize <width>',
    usage: 'reply to an image with .resize 512',
    cooldownMs: 2500,
    __apply: (s, args = []) => s.resize({ width: Math.min(2048, Math.max(64, parseInt(args[0], 10) || 512)) }),
    __format: 'jpeg',
    async run({ msg, sock, reply, args }) {
      const width = Math.min(2048, Math.max(64, parseInt(args[0], 10) || 512));
      const buffer = await grabImage(sock, msg);
      if (!buffer) return reply({ text: '↩️ Reply to an image with .resize 512' });
      const out = await sharp(buffer).rotate().resize({ width }).jpeg({ quality: 90 }).toBuffer();
      const meta = await sharp(out).metadata();
      await reply({ image: out, caption: `📏 ${meta.width}×${meta.height}` });
    },
  },
];

export default ops;
