import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/**
 * Thin ffmpeg wrapper. ffmpeg is optional: every command that needs it calls
 * `requireFfmpeg()` first and gets an actionable error instead of a crash.
 *
 * Argument building is pure and exported so scripts/test-audio.mjs can verify
 * the exact command lines without a binary present.
 */

/**
 * yt-dlp looks for a binary literally named `ffmpeg` inside --ffmpeg-location,
 * but packaged builds (e.g. pip's imageio-ffmpeg) use versioned filenames.
 * Expose a stable `ffmpeg` symlink and hand that directory to yt-dlp.
 */
let locationCache;
export async function ffmpegLocation() {
  if (locationCache !== undefined) return locationCache;
  const bin = process.env.FFMPEG_PATH || 'ffmpeg';
  if (path.basename(bin) === 'ffmpeg') { locationCache = path.dirname(bin) === '.' ? null : path.dirname(bin); return locationCache; }
  try {
    const dir = path.join(os.tmpdir(), 'nova-bin');
    await fs.mkdir(dir, { recursive: true });
    const link = path.join(dir, 'ffmpeg');
    try { await fs.symlink(bin, link); } catch { /* already linked */ }
    await fs.access(link);
    locationCache = dir;
  } catch {
    locationCache = null;
  }
  return locationCache;
}

export class FfmpegError extends Error {
  constructor(message) { super(message); this.name = 'FfmpegError'; }
}

let cached = null;

export async function hasFfmpeg() {
  if (cached !== null) return cached;
  cached = await new Promise((resolve) => {
    const p = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-version']);
    p.on('error', () => resolve(false));
    p.on('close', (code) => resolve(code === 0));
    setTimeout(() => { p.kill(); resolve(false); }, 4000).unref?.();
  });
  return cached;
}

export const installHint = [
  'ffmpeg is not installed on this host.',
  '',
  '• Debian/Ubuntu : apt install -y ffmpeg',
  '• Alpine        : apk add ffmpeg',
  '• Termux        : pkg install ffmpeg',
  '• macOS         : brew install ffmpeg',
  '• or set FFMPEG_PATH to the binary',
].join('\n');

export async function requireFfmpeg() {
  if (await hasFfmpeg()) return true;
  throw new FfmpegError(installHint);
}

/** Media type of the replied message → ffmpeg input extension. */
export const inputExt = (type) => ({
  audioMessage: 'ogg',
  videoMessage: 'mp4',
  imageMessage: 'jpg',
  documentMessage: 'bin',
  stickerMessage: 'webp',
}[type] || 'bin');

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));

/**
 * Pure argument builders — `args` excludes the input/output paths.
 * Each returns { args, out } where out is the output extension.
 */
export const BUILDS = {
  tomp3: () => ({ args: ['-vn', '-acodec', 'libmp3lame', '-b:a', '128k'], out: 'mp3' }),

  // WhatsApp voice notes need opus in ogg
  tovoice: () => ({ args: ['-vn', '-acodec', 'libopus', '-b:a', '32k', '-vbr', 'on', '-compression_level', '10', '-application', 'voip'], out: 'ogg' }),

  toaudio: () => ({ args: ['-vn', '-acodec', 'aac', '-b:a', '128k'], out: 'm4a' }),

  reverse: () => ({ args: ['-af', 'areverse'], out: 'mp3' }),

  volume: (args = []) => {
    const factor = clamp(parseFloat(args[0]) || 2, 0.1, 16);
    return { args: ['-af', `volume=${factor}`, '-acodec', 'libmp3lame'], out: 'mp3' };
  },

  speed: (args = []) => {
    // atempo accepts 0.5–2.0 per instance, so chain for wider ranges
    const factor = clamp(parseFloat(args[0]) || 2, 0.25, 4);
    const filters = [];
    let remaining = factor;
    while (remaining > 2) { filters.push('atempo=2.0'); remaining /= 2; }
    while (remaining < 0.5) { filters.push('atempo=0.5'); remaining /= 0.5; }
    filters.push(`atempo=${remaining.toFixed(3)}`);
    return { args: ['-af', filters.join(','), '-acodec', 'libmp3lame'], out: 'mp3' };
  },

  /** .trim <start> <end|duration>  e.g. .trim 0:30 1:15  or  .trim 10 25 */
  trim: (args = []) => {
    const start = parseTime(args[0]);
    const end = parseTime(args[1]);
    if (start === null) throw new FfmpegError('Usage: .trim <start> <end> — e.g. .trim 0:30 1:00');
    const out = [];
    out.push('-ss', String(start));
    if (end !== null && end > start) out.push('-t', String(end - start));
    out.push('-acodec', 'libmp3lame');
    return { args: out, out: 'mp3' };
  },

  waveform: () => ({
    args: ['-filter_complex', 'showwavespic=s=640x200:colors=0x25D366', '-frames:v', '1', '-update', '1'],
    out: 'png',
  }),

  // WhatsApp plays "gifs" as silent, looping mp4 — raw GIF bytes are not valid there
  gif: () => ({
    args: ['-an', '-vf', 'fps=12,scale=trunc(iw/2)*2:-2:flags=lanczos', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'],
    out: 'mp4',
  }),
};

/** "1:05" / "65" / "1m05s" → seconds (null when unparseable). */
export function parseTime(value) {
  if (value === undefined || value === null || value === '') return null;
  const str = String(value).trim();
  if (/^\d+(\.\d+)?$/.test(str)) return Number(str);
  if (str.includes(':')) {
    const parts = str.split(':').map(Number);
    if (parts.some((n) => !Number.isFinite(n))) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }
  // 1h2m3s / 90s / 5m
  const m = str.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (m && (m[1] || m[2] || m[3])) {
    return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
  }
  return null;
}

/** Run ffmpeg over a buffer, returning the converted buffer. */
export async function convertBuffer(input, { args = [], out = 'mp3', timeout = 120_000 } = {}) {
  await requireFfmpeg();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nova-ff-'));
  const inPath = path.join(dir, 'in.bin');
  const outPath = path.join(dir, `out.${out}`);
  try {
    await fs.writeFile(inPath, input);
    await new Promise((resolve, reject) => {
      const proc = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', inPath, ...args, outPath]);
      let stderr = '';
      proc.stderr.on('data', (d) => { stderr += d.toString(); });
      const timer = setTimeout(() => { proc.kill('SIGKILL'); reject(new FfmpegError('ffmpeg timed out')); }, timeout);
      proc.on('error', (err) => { clearTimeout(timer); reject(new FfmpegError(`ffmpeg failed to start: ${err.message}`)); });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) return resolve();
        const hint = /Unknown encoder/.test(stderr) ? '\n\nThis ffmpeg build lacks that encoder — install a full build (apt install ffmpeg).' : '';
        reject(new FfmpegError(`ffmpeg exited ${code}: ${stderr.split('\n').slice(-3).join(' ').slice(0, 300)}${hint}`));
      });
    });
    return await fs.readFile(outPath);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
