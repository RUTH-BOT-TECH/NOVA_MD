import crypto from 'node:crypto';
import { fetchJson as getJson, fetchBuffer as getBuffer } from '../../src/lib/http.js';
import { formatBytes } from '../../src/lib/ytdlp.js';
import { row, sc } from '../../src/lib/ui.js';

/**
 * Music previews. Deezer and Apple both publish a 30-second preview for every
 * track without an API key, so these commands return real audio instead of a
 * link the user has to open somewhere else. Metadata only where a preview is
 * genuinely not public (Spotify).
 */

const frame = (title, lines) => [`┏❐ 《 ${sc(title)} 》 ❐`, ...lines, '┗❐'].join('\n');
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const mmss = (sec) => `${Math.floor(Number(sec || 0) / 60)}:${String(Math.floor(Number(sec || 0) % 60)).padStart(2, '0')}`;

async function deezerSearch(query, limit = 5) {
  const data = await getJson(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!data?.data?.length) return [];
  return data.data.map((t) => ({
    title: clean(t.title),
    artist: clean(t.artist?.name),
    album: clean(t.album?.title),
    seconds: t.duration,
    preview: t.preview,
    cover: t.album?.cover_medium,
    url: t.link,
  }));
}

async function appleSearch(query, limit = 5) {
  const data = await getJson(`https://itunes.apple.com/search?media=music&entity=song&limit=${limit}&term=${encodeURIComponent(query)}`);
  if (!data?.results?.length) return [];
  return data.results
    .filter((r) => r.previewUrl)
    .map((r) => ({
      title: clean(r.trackName),
      artist: clean(r.artistName),
      album: clean(r.collectionName),
      seconds: Math.round((r.trackTimeMillis || 0) / 1000),
      preview: r.previewUrl,
      cover: r.artworkUrl100?.replace('100x100', '600x600'),
      url: r.trackViewUrl,
    }));
}

async function sendPreview(reply, track, platform) {
  if (!track.preview) {
    return reply({ text: `🎧 *${track.title}* — ${track.artist}\n┃ ${sc('no public preview')} · ${track.url || ''}` });
  }
  const buffer = await getBuffer(track.preview);
  if (!buffer?.length) return reply({ text: '❌ The preview would not download — try again in a moment.' });
  await reply({
    audio: buffer,
    mimetype: 'audio/mpeg',
    ptt: false,
    caption: frame(platform, [
      row('title', track.title),
      row('artist', track.artist),
      row('album', track.album || '—'),
      row('length', mmss(track.seconds)),
      row('preview', `${formatBytes(buffer.length)} · 30s`),
    ]),
  });
}

export default [
  {
    name: 'deezer',
    aliases: ['dz'],
    category: 'media',
    description: 'Search Deezer and send the 30s preview',
    usage: '.deezer burna boy last last',
    cooldownMs: 6000,
    async run({ argsText, reply }) {
      const query = String(argsText).trim();
      if (!query) return reply({ text: 'Usage: .deezer <song or artist>' });
      const tracks = await deezerSearch(query);
      if (!tracks.length) return reply({ text: `🔍 Nothing on Deezer for *${query}*.` });
      await sendPreview(reply, tracks[0], 'deezer');
    },
  },

  {
    name: 'deezerlist',
    aliases: ['dzlist'],
    category: 'media',
    description: 'Top Deezer matches without downloading',
    usage: '.deezerlist wizkid',
    async run({ argsText, reply }) {
      const query = String(argsText).trim();
      if (!query) return reply({ text: 'Usage: .deezerlist <song or artist>' });
      const tracks = await deezerSearch(query);
      if (!tracks.length) return reply({ text: `🔍 Nothing for *${query}*.` });
      await reply({
        text: [
          '┏❐ 《 ᴅᴇᴇᴢᴇʀ 》 ❐',
          ...tracks.map((t, i) => `┣◆ ${i + 1}. ${t.title} — ${t.artist} (${mmss(t.seconds)})`),
          `┃ ${sc('play')} : .deezer ${query}`,
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'applemusic',
    aliases: ['itunes', 'apple'],
    category: 'media',
    description: 'Search Apple Music and send the preview',
    usage: '.applemusic asake loneliness',
    cooldownMs: 6000,
    async run({ argsText, reply }) {
      const query = String(argsText).trim();
      if (!query) return reply({ text: 'Usage: .applemusic <song or artist>' });
      const tracks = await appleSearch(query);
      if (!tracks.length) return reply({ text: `🔍 Nothing on Apple Music for *${query}*.` });
      await sendPreview(reply, tracks[0], 'apple music');
    },
  },

  {
    name: 'spotifysearch',
    aliases: ['spotify'],
    category: 'media',
    description: 'Spotify metadata from a track link (Spotify audio needs an account)',
    usage: '.spotify https://open.spotify.com/track/…',
    cooldownMs: 5000,
    async run({ argsText, reply }) {
      const arg = String(argsText).trim();
      const url = arg.match(/https?:\/\/open\.spotify\.com\/\S+/)?.[0];
      if (!url) return reply({ text: 'Usage: .spotify <open.spotify.com track link>' });
      const meta = await getJson(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
      const title = clean(meta?.title || '');
      if (!title) return reply({ text: '❌ Spotify would not describe that link.' });
      const [name, artist] = title.split(/\s+by\s+/);
      const cover = meta.thumbnail_url ? await getBuffer(meta.thumbnail_url).catch(() => null) : null;
      const caption = frame('spotify', [
        row('title', name || title),
        row('artist', artist || '—'),
        row('provider', clean(meta.provider_name || 'Spotify')),
        row('audio', 'not public — needs a Spotify login'),
      ]);
      if (cover?.length) return reply({ image: cover, caption });
      await reply({ text: caption });
    },
  },
];
