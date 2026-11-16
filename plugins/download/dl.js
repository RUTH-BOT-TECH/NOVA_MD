import fs from 'node:fs/promises';
import {
  probe, info, downloadToFile, isUrl, DownloadError, formatBytes, hasFfmpeg,
} from '../../src/lib/ytdlp.js';
import { resolveMedia, resolveInfo, resolveSearch, strategyStatus, videoIdOf } from '../../src/lib/yt-resolver.js';
import { row } from '../../src/lib/ui.js';

const AUDIO_EXT = { m4a: 'audio/mp4', webm: 'audio/webm', mp3: 'audio/mpeg', opus: 'audio/ogg', ogg: 'audio/ogg', mp4: 'audio/mp4' };
const VIDEO_EXT = { mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime' };
const YOUTUBE = /youtu\.?be/.test('youtube.com') && true;

const mmss = (s) => {
  if (!s && s !== 0) return '—';
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
};

async function requireTool(reply) {
  const p = await probe();
  if (p.ok) return true;
  await reply({
    text: `❌ *${p.error}*\n\nInstall on the host:\n• Debian/Ubuntu: \`apt install yt-dlp ffmpeg\`\n• pip: \`pip install -U yt-dlp\`\n• or set \`YTDLP_PATH\` to the binary.`,
  });
  return false;
}

/** Accepts a name or a link; returns a ranked list of candidates. */
async function resolveCandidates(input) {
  if (isUrl(input)) {
    const meta = await resolveInfo(input).catch(() => ({}));
    return [{ url: input, ...meta }];
  }
  const results = await resolveSearch(input, 8);
  if (!results.length) throw new DownloadError('Nothing found for that search.');

  // Rank: skip live radio, prefer song-length clips over multi-hour compilations.
  const scored = results
    // flat-playlist entries for live streams carry no duration, so require one
    .filter((r) => !r.isLive && Number(r.duration) > 0)
    .map((r) => {
      const d = r.duration || 0;
      const ideal = d >= 45 && d <= 600 ? 0 : d > 600 && d <= 1200 ? 1 : d < 45 ? 2 : 3;
      return { ...r, rank: ideal, score: ideal * 1e6 + d };
    })
    .sort((a, b) => a.score - b.score);

  if (!scored.length) {
    throw new DownloadError('Only live streams matched that search — add a song name or "official audio".');
  }
  return scored;
}

const downloader = (name, description, usage, mode, aliases = []) => ({
  name,
  aliases,
  category: 'download',
  description,
  usage,
  cooldownMs: 8000,
  async run({ argsText, reply, prefix, command }) {
    const input = String(argsText || '').trim();
    if (!input) return reply({ text: `Usage: ${prefix}${command} <song name or link>` });

    try {
      const candidates = await resolveCandidates(input);
      if (!candidates.length) throw new DownloadError('Nothing to download for that search.');

      // try a few candidates: long mixes and region locks shouldn't kill the command
      let out = null;
      let target = null;
      const failures = [];
      for (const candidate of candidates.slice(0, 3)) {
        try {
          target = candidate;
          await reply({ text: `⏳ ${mode === 'audio' ? '🎵' : '🎬'} ${(candidate.title || 'media').slice(0, 80)}\n_fetching…_` });
          out = await resolveMedia(candidate.url, mode);
          break;
        } catch (err) {
          failures.push(`${(candidate.title || candidate.url).slice(0, 40)}: ${err.message.split('\n')[0].slice(0, 60)}`);
          out = null;
        }
      }
      if (!out) throw new DownloadError(failures.join('\n') || 'no candidate could be downloaded');

      const ext = out.ext || (mode === 'audio' ? 'm4a' : 'mp4');
      const sizeText = formatBytes(out.buffer.length);
      const caption = [
        `*${(out.title || target.title || 'download').slice(0, 100)}*`,
        target.duration ? `⏱️ ${mmss(target.duration)}` : '',
        target.uploader ? `👤 ${target.uploader}` : '',
        `📦 ${sizeText} · ${ext}`,
        `_via ${out.via}_`,
      ].filter(Boolean).join('  ·  ');

      if (mode === 'audio') {
        const mime = AUDIO_EXT[ext];
        if (!mime) {
          return reply({ text: `⚠️ Got \`.${ext}\`, which WhatsApp may not play. Install ffmpeg so it can remux to m4a.` });
        }
        await reply({ audio: out.buffer, mimetype: mime, ptt: false });
        await reply({ text: caption });
      } else {
        if (out.buffer.length > 60 * 1024 * 1024) return reply({ text: `⚠️ ${sizeText} is too big for WhatsApp media.` });
        await reply({ video: out.buffer, mimetype: VIDEO_EXT[ext] || 'video/mp4', caption });
      }
    } catch (err) {
      let note = err.message;
      if (/ffmpeg/.test(note) && !(await hasFfmpeg())) note += ' (ffmpeg not found on this host)';
      await reply({ text: `❌ ${note.slice(0, 900)}` });
    }
  },
});

export default [
  downloader('play', 'Search and send a song as audio', '.play lo-fi beats', 'audio', ['song', 'ytmp3', 'music']),
  downloader('ytv', 'Search and send a video', '.ytv blender open movie', 'video', ['ytmp4', 'video']),
  downloader('dl', 'Download any supported link (audio)', '.dl <url>', 'audio', ['download']),

  {
    name: 'yts',
    aliases: ['ytsearch', 'find'],
    category: 'download',
    description: 'Search YouTube and list results',
    usage: '.yts lofi beats',
    cooldownMs: 6000,
    async run({ argsText, reply }) {
      const q = String(argsText || '').trim();
      if (!q) return reply({ text: 'Usage: .yts <search terms>' });
      try {
        const results = await resolveSearch(q, 5);
        if (!results.length) return reply({ text: 'No results.' });
        await reply({
          text: [
            `🔎 *${q}*`,
            '',
            ...results.map((r, i) => `${i + 1}. *${r.title?.slice(0, 70)}*\n    ⏱️ ${mmss(r.duration)} · ${r.url}`),
          ].join('\n'),
        });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 500)}` });
      }
    },
  },

  {
    name: 'ytinfo',
    aliases: ['yt'],
    category: 'download',
    description: 'Metadata for a video link (no download)',
    usage: '.ytinfo <url>',
    async run({ argsText, reply }) {
      const url = String(argsText || '').trim();
      if (!isUrl(url)) return reply({ text: 'Usage: .ytinfo <url>' });
      try {
        const m = await resolveInfo(url);
        await reply({
          text: [
            '┏❐ 《 ᴍᴇᴅɪᴀ ɪɴꜰᴏ 》 ❐',
            row('title', (m.title || '—').slice(0, 80)),
            row('duration', mmss(m.duration)),
            row('uploader', m.uploader || '—'),
            row('via', m.via || '—'),
            '┗❐',
          ].join('\n'),
        });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 700)}` });
      }
    },
  },

  // non-YouTube sites go straight through yt-dlp's own extractors
  ...['tiktok', 'instagram', 'facebook', 'twitter', 'reddit'].map((site) => ({
    name: site,
    aliases: site === 'twitter' ? ['x'] : [],
    category: 'download',
    description: `Download from ${site} (yt-dlp extractor)`,
    usage: `.${site} <link>`,
    cooldownMs: 8000,
    async run({ argsText, reply, prefix, command }) {
      const url = String(argsText || '').trim();
      if (!isUrl(url)) return reply({ text: `Usage: ${prefix}${command} <${site} link>` });
      if (!(await requireTool(reply))) return;
      try {
        const file = await downloadToFile(url, { mode: 'video', maxHeight: 720 });
        const buffer = await fs.readFile(file.file);
        await file.cleanup();
        if (file.size > 60 * 1024 * 1024) return reply({ text: `⚠️ ${formatBytes(file.size)} is too big for WhatsApp.` });
        await reply({ video: buffer, mimetype: VIDEO_EXT[file.ext] || 'video/mp4', caption: `📥 ${site} · ${formatBytes(file.size)}` });
      } catch (err) {
        await reply({ text: `❌ ${err instanceof DownloadError ? err.message : 'download failed'}` });
      }
    },
  })),

  {
    name: 'dlstatus',
    aliases: ['ytdlp', 'strategies'],
    category: 'download',
    description: 'Which download strategies are available on this host',
    usage: '.dlstatus',
    async run({ reply }) {
      const status = await strategyStatus();
      const ff = await hasFfmpeg();
      await reply({
        text: [
          '┏❐ 《 ᴅᴏᴡɴʟᴏᴀᴅᴇʀ 》 ❐',
          ...Object.entries(status).map(([k, v]) => row(k, v)),
          row('ffmpeg', ff ? 'ok' : 'missing (remux/merge limited)'),
          row('size cap', `${process.env.MAX_DOWNLOAD_MB || 48} MB`),
          '┗❐',
          '',
          '_Tried in order: external api → piped → invidious → yt-dlp → ytdl-core_',
        ].join('\n'),
      });
    },
  },
];
