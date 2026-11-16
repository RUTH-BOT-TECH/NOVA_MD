import { spawn } from 'node:child_process';
import { ffmpegLocation } from './ffmpeg.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

/**
 * Thin, dependency-free wrapper around the yt-dlp binary.
 *
 * Why the binary and not ytdl-core: YouTube changes its player constantly and
 * pure-JS extractors rot within weeks. yt-dlp is updated by its maintainers,
 * handles 1000+ sites, and can be told to use real cookies when YouTube decides
 * a datacenter IP looks like a bot. That is the piece everyone's bots trip on.
 */

const BIN = process.env.YTDLP_PATH || 'yt-dlp';
const TIMEOUT = Number(process.env.YTDLP_TIMEOUT_MS || 120_000);
const MAX_BYTES = Number(process.env.MAX_DOWNLOAD_MB || 48) * 1024 * 1024;

const BASE_ARGS = ['--no-warnings', '--no-playlist', '--no-progress', '--no-call-home', '--socket-timeout', '15'];

let ffmpegArgCache;
async function ffmpegArg() {
  if (ffmpegArgCache !== undefined) return ffmpegArgCache;
  if (!process.env.FFMPEG_PATH) { ffmpegArgCache = null; return null; }
  const loc = await ffmpegLocation();
  ffmpegArgCache = loc ? ['--ffmpeg-location', loc] : null;
  return ffmpegArgCache;
}

async function extraArgs() {
  const args = [];
  // cookies let yt-dlp act as a logged-out-but-real browser when YouTube bot-checks
  if (process.env.YTDLP_COOKIES) args.push('--cookies', process.env.YTDLP_COOKIES);
  else if (process.env.YTDLP_COOKIES_FROM_BROWSER) args.push('--cookies-from-browser', process.env.YTDLP_COOKIES_FROM_BROWSER);
  // e.g. YTDLP_EXTRACTOR_ARGS="youtube:player_client=android,ios"
  if (process.env.YTDLP_EXTRACTOR_ARGS) args.push('--extractor-args', process.env.YTDLP_EXTRACTOR_ARGS);
  if (process.env.YTDLP_PROXY) args.push('--proxy', process.env.YTDLP_PROXY);
  // HLS/DASH sources and partial downloads need ffmpeg; point yt-dlp at ours
  const ff = await ffmpegArg();
  if (ff) args.push(...ff);
  return args;
}

export class DownloadError extends Error {}

function run(args, { timeout = TIMEOUT } = {}) {
  return extraArgs().then((extra) => new Promise((resolve, reject) => {
    const child = spawn(BIN, [...BASE_ARGS, ...extra, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    let size = 0;

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new DownloadError(`Timed out after ${Math.round(timeout / 1000)}s.`));
    }, timeout);

    child.stdout.on('data', (d) => {
      size += d.length;
      if (size <= 40 * 1024 * 1024) out += d.toString();
    });
    child.stderr.on('data', (d) => { err += d.toString().slice(0, 4000); });

    child.on('error', (e) => {
      clearTimeout(timer);
      if (e.code === 'ENOENT') {
        reject(new DownloadError(
          'yt-dlp is not installed. Install it (pip install yt-dlp, or apt install yt-dlp) or set YTDLP_PATH.'
        ));
      } else reject(new DownloadError(e.message));
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(out);
      reject(new DownloadError(friendly(err) || `yt-dlp exited with ${code}`));
    });
  }));
}

/** Turn yt-dlp stderr into something a WhatsApp user can act on. */
function friendly(stderr) {
  if (!stderr) return '';
  if (/Sign in to confirm you.?re not a bot/i.test(stderr)) {
    return 'YouTube is bot-checking this server. Set YTDLP_COOKIES=/path/cookies.txt (export from a browser) or YTDLP_EXTRACTOR_ARGS="youtube:player_client=android,ios".';
  }
  if (/Video unavailable|This video is private|removed/i.test(stderr)) return 'That video is unavailable or private.';
  if (/Unsupported URL/i.test(stderr)) return 'That link is not supported.';
  if (/HTTP Error 429/i.test(stderr)) return 'Rate-limited by the source. Try again in a minute.';
  if (/ffmpeg/i.test(stderr)) return 'This download needs ffmpeg (install it on the host).';
  return stderr.split('\n').filter(Boolean).slice(-1)[0]?.replace(/^ERROR:\s*/, '') || '';
}

export const isUrl = (v = '') => /^https?:\/\//i.test(String(v).trim());

let cachedProbe = null;
export async function probe() {
  if (cachedProbe) return cachedProbe;
  try {
    const version = (await run(['--version'], { timeout: 15_000 })).trim();
    cachedProbe = { ok: true, version };
  } catch (err) {
    cachedProbe = { ok: false, error: err.message };
  }
  return cachedProbe;
}

/** Full metadata as JSON. */
export async function info(url) {
  const json = await run(['-J', url]);
  try { return JSON.parse(json); } catch { throw new DownloadError('Could not read metadata from that link.'); }
}

/** YouTube (or any extractor) search → light list. */
export async function search(query, limit = 5) {
  const json = await run([`--flat-playlist`, '-J', `ytsearch${Math.min(limit, 10)}:${query}`], { timeout: 60_000 });
  const parsed = JSON.parse(json);
  return (parsed.entries || []).map((e) => ({
    id: e.id,
    title: e.title,
    duration: e.duration,
    isLive: Boolean(e.is_live),
    uploader: e.uploader,
    url: e.url?.startsWith('http') ? e.url : `https://www.youtube.com/watch?v=${e.id}`,
    thumbnail: e.thumbnails?.[0]?.url,
  }));
}

/**
 * Download to a temp file, enforcing a size cap.
 *
 * Format selection is deliberately tolerant: YouTube now serves HLS (m3u8)
 * renditions to some clients, where strict `[ext=m4a]` selectors find nothing.
 * We ask yt-dlp to pick the best stream, remux to a WhatsApp-friendly container,
 * and retry with an explicit player client if the first attempt fails.
 */
export async function downloadToFile(url, { mode = 'audio', maxHeight = 480, onProgress } = {}) {
  // A live stream never finishes downloading; check first instead of hanging.
  let duration = 0;
  try {
    const meta = await info(url);
    if (meta.is_live) throw new DownloadError('That link is a live stream — it has no end, so it cannot be downloaded.');
    duration = Number(meta.duration) || 0;
  } catch (err) {
    if (err instanceof DownloadError && /live stream/.test(err.message)) throw err;
    // metadata problems shouldn't block the download attempt
  }

  // Long mixes would blow past the size cap, so take a bounded section instead.
  const sectionLimit = mode === 'audio' ? 900 : 1200; // 15 min audio, 20 min video
  const section = duration > sectionLimit ? ['--download-sections', `*0-${sectionLimit}`] : [];

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nova-'));
  const template = path.join(dir, 'media.%(ext)s');
  const cap = ['--max-filesize', String(MAX_BYTES)];
  const timeout = Number(process.env.YTDLP_DOWNLOAD_TIMEOUT_MS || 180_000);

  const attempts = mode === 'audio'
    ? [
        ['-f', 'ba/b', '-x', '--audio-format', 'm4a', ...cap],
        ['-f', 'bestaudio/best', ...cap],
      ]
    : [
        ['-f', `bv*[height<=${maxHeight}]+ba/b[height<=${maxHeight}]/bv*+ba/b`, '--merge-output-format', 'mp4', ...cap],
        ['-f', `best[height<=${maxHeight}]/best`, ...cap],
      ];

  const clientRetry = ['--extractor-args', 'youtube:player_client=android,tv_embedded'];
  const errors = [];

  for (const [index, args] of attempts.entries()) {
    const variants = index === 0 ? [args, [...args, ...clientRetry]] : [args];
    for (const variant of variants) {
      try {
        await run(['-o', template, ...section, ...variant, url], { timeout, onProgress });
        const files = (await fs.readdir(dir)).filter((f) => !f.endsWith('.part'));
        if (!files.length) throw new DownloadError('no file produced');
        const file = path.join(dir, files[0]);
        const stat = await fs.stat(file);
        if (stat.size > MAX_BYTES) {
          throw new DownloadError(`File is ${(stat.size / 1048576).toFixed(1)}MB — over the ${(MAX_BYTES / 1048576).toFixed(0)}MB cap.`);
        }
        return {
          file,
          size: stat.size,
          ext: path.extname(file).replace('.', ''),
          cleanup: () => fs.rm(dir, { recursive: true, force: true }).catch(() => {}),
        };
      } catch (err) {
        errors.push(err.message);
        await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
        await fs.mkdir(dir, { recursive: true }).catch(() => {});
      }
    }
  }

  await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  const unique = [...new Set(errors.map((e) => e
    .replace(/^.*?ERROR:\s*/, '')
    .replace(/File is larger than max-filesize.*/i, 'that file is bigger than the download cap (raise MAX_DOWNLOAD_MB)')
    .slice(0, 160)))];
  throw new DownloadError(unique.slice(0, 3).join(' | ') || 'download failed');
}

export const hasFfmpeg = () => new Promise((resolve) => {
  const c = spawn(process.env.FFMPEG_PATH || 'ffmpeg', ['-version'], { stdio: 'ignore' });
  c.on('error', () => resolve(false));
  c.on('close', (code) => resolve(code === 0));
});

export const formatBytes = (n) => `${(n / 1048576).toFixed(2)} MB`;
