import fs from 'node:fs/promises';
import { probe as ytdlpProbe, info as ytdlpInfo, search as ytdlpSearch, downloadToFile, DownloadError } from './ytdlp.js';
import { convertBuffer, hasFfmpeg, BUILDS } from './ffmpeg.js';

/**
 * YouTube is the hardest target on the internet to keep working, so this resolver
 * tries several strategies and reports every failure. Configure whichever one your
 * host can actually use:
 *
 *   YTDLP_COOKIES=/app/cookies.txt        yt-dlp with a real browser session
 *   PIPED_URL=https://pipedapi.example    keyless proxy, needs a live instance
 *   INVIDIOUS_URL=https://inv.example     keyless proxy, needs a live instance
 *   DOWNLOAD_API_URL=https://api.example/yt?url={url}&key={key}
 *   DOWNLOAD_API_KEY=...                  substituted for {key}
 *
 * The API strategy is what most public bots actually do: they never touch YouTube,
 * they call someone else's server. You can point this at any endpoint that returns
 * JSON containing a direct media URL.
 */

const MAX_BYTES = Number(process.env.MAX_DOWNLOAD_MB || 48) * 1024 * 1024;

export const videoIdOf = (input = '') => {
  const m = String(input).match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : /^[\w-]{11}$/.test(String(input).trim()) ? String(input).trim() : null;
};

async function fetchBuffer(url, { timeout = 90_000, limit = MAX_BYTES } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > limit) throw new Error(`file too large (${(buffer.length / 1048576).toFixed(1)}MB)`);
    return buffer;
  } finally {
    clearTimeout(timer);
  }
}

const extOf = (url = '', fallback = 'mp4') => (url.match(/\.(m4a|mp3|mp4|webm|ogg|opus)(?:\?|$)/i)?.[1] || fallback).toLowerCase();

/** Walk any JSON shape looking for a plausible media URL. */
export function digMediaUrl(obj, depth = 0) {
  if (!obj || depth > 6) return null;
  if (typeof obj === 'string') {
    return /^https?:\/\/.+\.(m4a|mp3|mp4|webm|ogg)(\?|$)/i.test(obj) ? obj : null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) { const hit = digMediaUrl(item, depth + 1); if (hit) return hit; }
    return null;
  }
  if (typeof obj === 'object') {
    for (const key of ['url', 'link', 'download', 'downloadUrl', 'download_url', 'audio', 'video', 'media', 'result', 'data', 'dl']) {
      if (obj[key]) { const hit = digMediaUrl(obj[key], depth + 1); if (hit) return hit; }
    }
    for (const value of Object.values(obj)) { const hit = digMediaUrl(value, depth + 1); if (hit) return hit; }
  }
  return null;
}

// WhatsApp-friendly containers: m4a/mp3 for audio, mp4 for video
const AUDIO_OK = new Set(['m4a', 'mp3', 'ogg', 'opus']);
const VIDEO_OK = new Set(['mp4', 'mov']);

/**
 * YouTube often serves webm/mkv renditions. WhatsApp plays those unreliably, so
 * transcode to a container it definitely accepts — only when ffmpeg is present.
 */
export async function normaliseContainer(buffer, ext, mode) {
  const ok = mode === 'audio' ? AUDIO_OK.has(ext) : VIDEO_OK.has(ext);
  if (ok) return { buffer, ext, transcoded: false };
  if (!(await hasFfmpeg())) return { buffer, ext, transcoded: false };

  try {
    if (mode === 'audio') {
      const mp3 = await convertBuffer(buffer, { args: ['-vn', '-acodec', 'libmp3lame', '-b:a', '128k'], out: 'mp3' });
      return { buffer: mp3, ext: 'mp3', transcoded: true };
    }
    const mp4 = await convertBuffer(buffer, {
      args: ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-pix_fmt', 'yuv420p'],
      out: 'mp4',
    });
    return { buffer: mp4, ext: 'mp4', transcoded: true };
  } catch {
    return { buffer, ext, transcoded: false };  // fall back to the original bytes
  }
}

// ── strategy: yt-dlp binary ───────────────────────────────────────────────
async function viaYtDlp(url, mode) {
  const file = await downloadToFile(url, { mode, maxHeight: 480 });
  const raw = await fs.readFile(file.file);
  const ext = file.ext;
  await file.cleanup();
  const out = await normaliseContainer(raw, ext, mode);
  return { buffer: out.buffer, ext: out.ext, via: `yt-dlp${out.transcoded ? ` → ${out.ext}` : ''}` };
}

// ── strategy: @distube/ytdl-core (works when the host IP is not flagged) ──
async function viaYtdlCore(url, mode) {
  let ytdl;
  try { ytdl = (await import('@distube/ytdl-core')).default; }
  catch { throw new Error('@distube/ytdl-core not installed'); }

  const info = await ytdl.getInfo(url);
  const format = mode === 'audio'
    ? ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' })
    : ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });

  const buffer = await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const stream = ytdl.downloadFromInfo(info, { format });
    stream.on('data', (c) => { size += c.length; if (size > MAX_BYTES) { stream.destroy(); reject(new Error('file too large')); } else chunks.push(c); });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

  return { buffer, ext: mode === 'audio' ? 'm4a' : 'mp4', title: info.videoDetails?.title, via: 'ytdl-core' };
}

// ── strategy: Piped ───────────────────────────────────────────────────────
async function viaPiped(url, mode) {
  const base = process.env.PIPED_URL;
  if (!base) throw new Error('PIPED_URL not set');
  const id = videoIdOf(url);
  if (!id) throw new Error('not a YouTube id');
  const res = await fetch(`${base.replace(/\/$/, '')}/streams/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const list = mode === 'audio' ? (data.audioStreams || []) : (data.videoStreams || []);
  if (!list.length) throw new Error('no streams returned');
  const best = list.filter((s) => s.url).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
  const buffer = await fetchBuffer(best.url);
  return { buffer, ext: mode === 'audio' ? 'm4a' : 'mp4', title: data.title, via: 'piped' };
}

// ── strategy: Invidious ───────────────────────────────────────────────────
async function viaInvidious(url, mode) {
  const base = process.env.INVIDIOUS_URL;
  if (!base) throw new Error('INVIDIOUS_URL not set');
  const id = videoIdOf(url);
  if (!id) throw new Error('not a YouTube id');
  const res = await fetch(`${base.replace(/\/$/, '')}/api/v1/videos/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const formats = data.adaptiveFormats || data.formatStreams || [];
  const pick = formats
    .filter((f) => (mode === 'audio' ? /audio/.test(f.type || '') : /video/.test(f.type || '')))
    .sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0))[0];
  if (!pick?.url) throw new Error('no playable formats');
  const buffer = await fetchBuffer(pick.url);
  return { buffer, ext: mode === 'audio' ? 'm4a' : 'mp4', title: data.title, via: 'invidious' };
}

// ── strategy: external downloader API (what most public bots use) ─────────
async function viaApi(url, mode) {
  const template = process.env.DOWNLOAD_API_URL;
  if (!template) throw new Error('DOWNLOAD_API_URL not set');
  const id = videoIdOf(url) || '';
  const endpoint = template
    .replaceAll('{url}', encodeURIComponent(url))
    .replaceAll('{id}', id)
    .replaceAll('{mode}', mode)
    .replaceAll('{key}', process.env.DOWNLOAD_API_KEY || '')
    .replaceAll('{apikey}', process.env.DOWNLOAD_API_KEY || '');

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  let json;
  try {
    const res = await fetch(endpoint, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } finally { clearTimeout(timer); }

  const mediaUrl = digMediaUrl(json);
  if (!mediaUrl) throw new Error('response contained no media URL');
  const buffer = await fetchBuffer(mediaUrl);
  return {
    buffer,
    ext: extOf(mediaUrl, mode === 'audio' ? 'm4a' : 'mp4'),
    title: json.title || json.result?.title || json.data?.title,
    via: 'external API',
  };
}

const STRATEGIES = [
  ['api', viaApi],
  ['piped', viaPiped],
  ['invidious', viaInvidious],
  ['yt-dlp', viaYtDlp],
  ['ytdl-core', viaYtdlCore],
];

/** Try every configured strategy; throw one readable error listing each attempt. */
export async function resolveMedia(url, mode = 'audio') {
  const tried = [];
  for (const [name, fn] of STRATEGIES) {
    try {
      const out = await fn(url, mode);
      if (out?.buffer?.length) return out;
      tried.push(`${name}: empty result`);
    } catch (err) {
      tried.push(`${name}: ${err.message.slice(0, 90)}`);
    }
  }
  throw new DownloadError(
    `Every download strategy failed:\n${tried.map((t) => `• ${t}`).join('\n')}\n\n`
    + 'Set one of: YTDLP_COOKIES · PIPED_URL · INVIDIOUS_URL · DOWNLOAD_API_URL'
  );
}

/** Metadata, with the same fallback philosophy. */
export async function resolveInfo(url) {
  const tried = [];
  try {
    const meta = await ytdlpInfo(url);
    return { title: meta.title, duration: meta.duration, uploader: meta.uploader || meta.channel, thumbnail: meta.thumbnail, via: 'yt-dlp' };
  } catch (err) { tried.push(`yt-dlp: ${err.message.slice(0, 70)}`); }

  try {
    const ytdl = (await import('@distube/ytdl-core')).default;
    const { videoDetails: v } = await ytdl.getInfo(url);
    return { title: v.title, duration: Number(v.lengthSeconds), uploader: v.author?.name, thumbnail: v.thumbnails?.at(-1)?.url, via: 'ytdl-core' };
  } catch (err) { tried.push(`ytdl-core: ${err.message.slice(0, 70)}`); }

  const base = process.env.PIPED_URL;
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/streams/${videoIdOf(url)}`);
      const d = await res.json();
      return { title: d.title, duration: d.duration, uploader: d.uploader, thumbnail: d.thumbnailUrl, via: 'piped' };
    } catch (err) { tried.push(`piped: ${err.message.slice(0, 70)}`); }
  }
  throw new DownloadError(`Could not read metadata:\n${tried.map((t) => `• ${t}`).join('\n')}`);
}

/** Search — yt-dlp first (it works even when downloads are blocked), then Piped. */
export async function resolveSearch(query, limit = 5) {
  const tried = [];
  try { return await ytdlpSearch(query, limit); }
  catch (err) { tried.push(`yt-dlp: ${err.message.slice(0, 60)}`); }

  const base = process.env.PIPED_URL;
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/search?q=${encodeURIComponent(query)}&filter=videos`);
      const d = await res.json();
      return (d.items || []).slice(0, limit).map((i) => ({
        id: videoIdOf(i.url), title: i.title, duration: i.duration, uploader: i.uploader, url: i.url, thumbnail: i.thumbnail,
      }));
    } catch (err) { tried.push(`piped: ${err.message.slice(0, 60)}`); }
  }
  throw new DownloadError(`Search failed:\n${tried.join('\n')}`);
}

export async function strategyStatus() {
  const yt = await ytdlpProbe();
  let ytdlCore = false;
  try { await import('@distube/ytdl-core'); ytdlCore = true; } catch { /* optional */ }
  return {
    'yt-dlp': yt.ok ? `ok ${yt.version}${process.env.YTDLP_COOKIES ? ' + cookies' : ''}` : 'missing',
    'ytdl-core': ytdlCore ? 'installed' : 'not installed',
    piped: process.env.PIPED_URL || 'not configured',
    invidious: process.env.INVIDIOUS_URL || 'not configured',
    'external api': process.env.DOWNLOAD_API_URL ? 'configured' : 'not configured',
  };
}
