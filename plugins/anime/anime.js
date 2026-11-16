import {
  searchAnime, topAnime, randomAnime, ongoingAnime, searchManga,
  animeCharacter, animeQuote, identifySceneBuffer, animeImage,
} from '../../src/lib/anime.js';
import { pickMedia, download } from '../../src/lib/media-input.js';
import { row } from '../../src/lib/ui.js';

const frame = (title, lines) => [`┏❐ 《 ${title} 》 ❐`, ...lines.filter(Boolean), '┗❐'].join('\n');

const entry = (a, i) => [
  `${i !== undefined ? `${i + 1}. ` : ''}*${a.title}*`,
  `┃ ${[a.year, a.kind, a.episodes ? `${a.episodes} eps` : null, a.score ? `★ ${a.score}` : null].filter(Boolean).join(' · ')}`,
  `┃ ${a.status}`,
  a.url ? `┃ ${a.url}` : '',
].filter(Boolean).join('\n');

export default [
  {
    name: 'anime',
    aliases: ['animeinfo', 'animesearch'],
    category: 'anime',
    description: 'Search anime by title',
    usage: '.anime frieren',
    cooldownMs: 4000,
    async run({ argsText, reply }) {
      const q = String(argsText || '').trim();
      if (!q) return reply({ text: 'Usage: .anime <title>  ·  try .randomanime for a surprise' });
      try {
        const hits = await searchAnime(q, 3);
        await reply({
          text: frame(`ᴀɴɪᴍᴇ · ${q}`, hits.map((a, i) => entry(a, i))),
        });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },

  {
    name: 'topanime',
    aliases: ['topanimes'],
    category: 'anime',
    description: 'Highest rated anime',
    usage: '.topanime',
    cooldownMs: 6000,
    async run({ reply }) {
      try {
        const hits = await topAnime(5);
        await reply({ text: frame('ᴛᴏᴘ ᴀɴɪᴍᴇ', hits.map((a, i) => entry(a, i))) });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },

  {
    name: 'randomanime',
    aliases: ['ranime'],
    category: 'anime',
    description: 'A random anime with cover art',
    usage: '.randomanime',
    cooldownMs: 4000,
    async run({ reply }) {
      try {
        const a = await randomAnime();
        const caption = frame('ʀᴀɴᴅᴏᴍ', [
          row('title', a.title),
          row('year', a.year),
          row('score', a.score ? `★ ${a.score}` : '—'),
          row('eps', a.episodes || '—'),
          a.description ? `┃ ${a.description}` : '',
          a.url ? row('link', a.url) : '',
        ]);
        if (a.image) await reply({ image: { url: a.image }, caption });
        else await reply({ text: caption });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },

  {
    name: 'ongoing',
    aliases: ['airing', 'seasonnow'],
    category: 'anime',
    description: 'Currently airing anime',
    usage: '.ongoing',
    cooldownMs: 6000,
    async run({ reply }) {
      try {
        const hits = await ongoingAnime(5);
        await reply({ text: frame('ᴀɪʀɪɴɢ ɴᴏᴡ', hits.map((a, i) => entry(a, i))) });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },

  {
    name: 'manga',
    aliases: ['mangasearch'],
    category: 'anime',
    description: 'Search manga by title',
    usage: '.manga berserk',
    cooldownMs: 4000,
    async run({ argsText, reply }) {
      const q = String(argsText || '').trim();
      if (!q) return reply({ text: 'Usage: .manga <title>' });
      try {
        const hits = await searchManga(q, 3);
        await reply({
          text: frame(`ᴍᴀɴɢᴀ · ${q}`, hits.map((m, i) => [
            `${i + 1}. *${m.title}*`,
            `┃ ${[m.year, m.status, m.chapters ? `${m.chapters} ch` : null, m.volumes ? `${m.volumes} vols` : null].filter(Boolean).join(' · ')}`,
            m.url ? `┃ ${m.url}` : '',
          ].filter(Boolean).join('\n'))),
        });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },

  {
    name: 'character',
    aliases: ['animechar', 'char'],
    category: 'anime',
    description: 'Look up an anime character',
    usage: '.character gojo',
    cooldownMs: 4000,
    async run({ argsText, reply }) {
      const q = String(argsText || '').trim();
      if (!q) return reply({ text: 'Usage: .character <name>' });
      try {
        const [c] = await animeCharacter(q);
        const caption = frame('ᴄʜᴀʀᴀᴄᴛᴇʀ', [
          row('name', c.name),
          row('from', c.from || '—'),
          c.native ? row('native', c.native) : '',
          c.about ? `┃ ${c.about}` : '',
        ]);
        if (c.image) await reply({ image: { url: c.image }, caption });
        else await reply({ text: caption });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },

  {
    name: 'animequote',
    aliases: ['aquote'],
    category: 'anime',
    description: 'Random anime quote',
    usage: '.animequote',
    cooldownMs: 3000,
    async run({ reply }) {
      try {
        const q = await animeQuote();
        await reply({ text: `💬 _${q.quote.slice(0, 600)}_\n\n— *${q.character}*, ${q.anime}` });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },

  {
    name: 'animescene',
    aliases: ['scene', 'whatanime'],
    category: 'anime',
    description: 'Identify the anime from a replied screenshot',
    usage: 'reply to an image with .animescene',
    cooldownMs: 8000,
    async run({ msg, sock, reply }) {
      const picked = pickMedia(msg);
      if (picked.type !== 'imageMessage') return reply({ text: '↩️ Reply to an anime screenshot with .animescene' });
      try {
        const buffer = await download(sock, picked.source);
        if (!buffer?.length) return reply({ text: '❌ Could not download that image.' });
        const hit = await identifySceneBuffer(buffer);
        await reply({
          text: frame('ꜱᴄᴇɴᴇ', [
            row('anime', hit.title),
            row('episode', hit.episode ?? '—'),
            row('timestamp', hit.at || '—'),
            row('confidence', `${hit.similarity}%`),
            row('source', hit.provider),
          ]),
        });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },

  {
    name: 'animepic',
    aliases: ['neko', 'waifu', 'husbando', 'kitsune'],
    category: 'anime',
    description: 'Random SFW anime picture',
    usage: '.animepic [neko|husbando|kitsune]',
    cooldownMs: 3000,
    async run({ args, command, reply }) {
      const kind = command !== 'animepic' ? command : (args[0] || 'neko').toLowerCase();
      const allowed = ['neko', 'husbando', 'kitsune', 'blush'];
      try {
        const img = await animeImage(allowed.includes(kind) ? kind : 'neko');
        await reply({ image: { url: img.url }, caption: `🎴 *${kind}*\n_${img.provider}_` });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },
];
