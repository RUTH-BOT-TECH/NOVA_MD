import { fetchJson, firstOf } from './http.js';

/**
 * Anime/manga data + reaction gifs.
 *
 * Every provider here was verified live from a cloud IP: Jikan and nekos.best
 * are NOT usable (Jikan times out, nekos.best 403s datacenter traffic), so the
 * chains below prefer Shikimori, Kitsu and AniList, and reactions use
 * otakugifs + purrbot.
 */

const UA = { 'user-agent': 'NOVA-MD/1.2 (WhatsApp bot)' };
const SHIKI = 'https://shikimori.one/api';
const ANILIST = 'https://graphql.anilist.co';

const cut = (s = '', n = 400) => {
  const t = String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

const shikiHeaders = { ...UA, accept: 'application/json' };

async function anilist(query, variables = {}) {
  const d = await fetchJson(ANILIST, {
    method: 'POST',
    headers: { ...UA, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    timeout: 15_000,
  });
  if (d.errors?.length) throw new Error(d.errors[0].message);
  return d.data;
}

const normaliseShiki = (a) => ({
  id: a.id,
  title: a.russian && a.name ? `${a.name}` : a.name,
  original: a.japanese?.[0]?.name || '',
  score: a.score ? Number(a.score) : null,
  episodes: a.episodes || null,
  status: a.status || '—',
  kind: a.kind || '—',
  year: (a.aired_on || '').slice(0, 4) || '—',
  description: cut(a.description, 420),
  image: a.image?.original ? `https://shikimori.one${a.image.original}` : null,
  url: a.url ? `https://shikimori.one${a.url}` : null,
  provider: 'shikimori',
});

const normaliseKitsu = (k) => ({
  id: k.id,
  title: k.attributes.canonicalTitle || k.attributes.titles?.en || '—',
  score: k.attributes.averageRating ? Math.round(Number(k.attributes.averageRating)) / 10 : null,
  episodes: k.attributes.episodeCount ?? null,
  status: k.attributes.status || '—',
  year: (k.attributes.startDate || '').slice(0, 4) || '—',
  description: cut(k.attributes.synopsis, 420),
  image: k.attributes.posterImage?.medium || null,
  url: k.attributes.slug ? `https://kitsu.io/anime/${k.attributes.slug}` : null,
  provider: 'kitsu',
});

const normaliseAniList = (m) => ({
  id: m.id,
  title: m.title.english || m.title.romaji,
  score: m.averageScore ?? null,
  episodes: m.episodes ?? null,
  status: m.status || '—',
  year: m.startDate?.year || '—',
  description: cut(m.description, 420),
  genres: m.genres || [],
  image: m.coverImage?.large || null,
  url: m.siteUrl || null,
  provider: 'anilist',
});

export async function searchAnime(query, limit = 5) {
  return firstOf([
    async () => {
      const d = await fetchJson(`${SHIKI}/animes?search=${encodeURIComponent(query)}&limit=${limit}&order=popularity`, { headers: shikiHeaders });
      if (!Array.isArray(d) || !d.length) throw new Error('no shikimori hits');
      return d.map(normaliseShiki);
    },
    async () => {
      const d = await fetchJson(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=${limit}`, { headers: UA });
      if (!d.data?.length) throw new Error('no kitsu hits');
      return d.data.map(normaliseKitsu);
    },
    async () => {
      const d = await anilist(`query($q:String){Page(perPage:${limit}){media(search:$q,type:ANIME){id title{romaji english} averageScore episodes status startDate{year} genres description coverImage{large} siteUrl}}}`, { q: query });
      const media = d.Page?.media || [];
      if (!media.length) throw new Error('no anilist hits');
      return media.map(normaliseAniList);
    },
  ]);
}

export async function topAnime(limit = 5) {
  return firstOf([
    async () => {
      const d = await fetchJson(`${SHIKI}/animes?order=ranked&limit=${limit}&kind=tv`, { headers: shikiHeaders });
      if (!Array.isArray(d) || !d.length) throw new Error('no shikimori top');
      return d.map(normaliseShiki);
    },
    async () => {
      const d = await fetchJson(`https://kitsu.io/api/edge/anime?sort=-averageRating&page[limit]=${limit}`, { headers: UA });
      return d.data.map(normaliseKitsu);
    },
    async () => {
      const d = await anilist(`{Page(perPage:${limit}){media(type:ANIME,sort:SCORE_DESC){id title{romaji english} averageScore episodes status startDate{year} genres description coverImage{large} siteUrl}}}`);
      return (d.Page?.media || []).map(normaliseAniList);
    },
  ]);
}

export async function randomAnime() {
  return firstOf([
    async () => {
      const d = await fetchJson(`${SHIKI}/animes?order=random&limit=1`, { headers: shikiHeaders });
      if (!Array.isArray(d) || !d[0]) throw new Error('no random hit');
      return normaliseShiki(d[0]);
    },
    async () => {
      const page = 1 + Math.floor(Math.random() * 50);
      const d = await anilist(`{Page(page:${page},perPage:1){media(type:ANIME,sort:POPULARITY_DESC){id title{romaji english} averageScore episodes status startDate{year} genres description coverImage{large} siteUrl}}}`);
      const m = d.Page?.media?.[0];
      if (!m) throw new Error('no random anilist hit');
      return normaliseAniList(m);
    },
  ]);
}

export async function ongoingAnime(limit = 5) {
  return firstOf([
    async () => {
      const d = await fetchJson(`${SHIKI}/animes?status=ongoing&order=popularity&limit=${limit}`, { headers: shikiHeaders });
      if (!Array.isArray(d) || !d.length) throw new Error('no ongoing');
      return d.map(normaliseShiki);
    },
    async () => {
      const d = await anilist(`{Page(perPage:${limit}){media(type:ANIME,status:RELEASING,sort:POPULARITY_DESC){id title{romaji english} averageScore episodes status startDate{year} genres coverImage{large} siteUrl}}}`);
      return (d.Page?.media || []).map(normaliseAniList);
    },
  ]);
}

export async function searchManga(query, limit = 5) {
  return firstOf([
    async () => {
      const d = await fetchJson(`${SHIKI}/mangas?search=${encodeURIComponent(query)}&limit=${limit}&order=popularity`, { headers: shikiHeaders });
      if (!Array.isArray(d) || !d.length) throw new Error('no manga hits');
      return d.map((m) => ({
        id: m.id, title: m.name, score: m.score ? Number(m.score) : null,
        volumes: m.volumes || null, chapters: m.chapters || null,
        status: m.status || '—', year: (m.aired_on || '').slice(0, 4) || '—',
        description: cut(m.description, 400),
        image: m.image?.original ? `https://shikimori.one${m.image.original}` : null,
        url: m.url ? `https://shikimori.one${m.url}` : null, provider: 'shikimori',
      }));
    },
    async () => {
      const d = await fetchJson(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=${limit}`, { headers: UA });
      return d.data.map((k) => ({
        id: k.id, title: k.attributes.canonicalTitle, score: null,
        volumes: k.attributes.volumeCount ?? null, chapters: k.attributes.chapterCount ?? null,
        status: k.attributes.status || '—', year: (k.attributes.startDate || '').slice(0, 4) || '—',
        description: cut(k.attributes.synopsis, 400),
        image: k.attributes.posterImage?.medium || null,
        url: k.attributes.slug ? `https://kitsu.io/manga/${k.attributes.slug}` : null, provider: 'kitsu',
      }));
    },
  ]);
}

export async function animeCharacter(query) {
  return firstOf([
    async () => {
      const d = await anilist(`query($q:String){Page(perPage:3){characters(search:$q){id name{full native} description image{large} siteUrl media(perPage:1){nodes{title{romaji english}}}}}}`, { q: query });
      const chars = d.Page?.characters || [];
      if (!chars.length) throw new Error('no characters');
      return chars.map((c) => ({
        name: c.name.full || c.name.native,
        native: c.name.native || '',
        about: cut(c.description, 350),
        image: c.image?.large || null,
        from: c.media?.nodes?.[0]?.title?.romaji || null,
        url: c.siteUrl, provider: 'anilist',
      }));
    },
  ]);
}

export async function animeQuote() {
  return firstOf([
    async () => {
      const d = await fetchJson('https://api.animechan.io/v1/quotes/random', { headers: UA });
      const q = d.data;
      if (!q?.content) throw new Error('no quote');
      return { quote: q.content, character: q.character?.name || '—', anime: q.anime?.name || '—', provider: 'animechan' };
    },
  ]);
}

/** Identify an anime frame from raw image bytes (trace.moe accepts an upload). */
export async function identifySceneBuffer(buffer) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: 'image/jpeg' }), 'frame.jpg');
  const res = await fetch('https://api.trace.moe/search?anilistInfo&cutBorders', {
    method: 'POST',
    body: form,
    headers: UA,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`trace.moe returned HTTP ${res.status}`);
  const d = await res.json();
  if (d.error) throw new Error(d.error);
  const hit = d.result?.[0];
  if (!hit) throw new Error('no match found for that frame');
  return {
    title: hit.anilist?.title?.romaji || hit.anilist?.title?.english || hit.filename,
    episode: hit.episode ?? null,
    similarity: Math.round((hit.similarity || 0) * 100),
    at: hit.from ? `${Math.floor(hit.from / 60)}:${String(Math.floor(hit.from % 60)).padStart(2, '0')}` : null,
    preview: hit.image || null,
    provider: 'trace.moe',
  };
}

/** Identify the anime in a screenshot (trace.moe). */
export async function identifyScene(imageUrl) {
  const d = await fetchJson(`https://api.trace.moe/search?anilistInfo&url=${encodeURIComponent(imageUrl)}`, { headers: UA, timeout: 25_000 });
  if (d.error) throw new Error(d.error);
  const hit = d.result?.[0];
  if (!hit) throw new Error('no match found for that frame');
  return {
    title: hit.anilist?.title?.romaji || hit.anilist?.title?.english || hit.filename,
    episode: hit.episode ?? null,
    similarity: Math.round((hit.similarity || 0) * 100),
    at: hit.from ? `${Math.floor(hit.from / 60)}:${String(Math.floor(hit.from % 60)).padStart(2, '0')}` : null,
    preview: hit.image || null,
    provider: 'trace.moe',
  };
}

const REACTION_FALLBACK = ['wave', 'poke'];

export async function reactionGif(action) {
  return firstOf([
    async () => {
      const d = await fetchJson(`https://api.otakugifs.xyz/gif?reaction=${action}&format=gif`, { headers: UA, timeout: 15_000 });
      if (!d.url) throw new Error('no otakugifs url');
      return { url: d.url, gif: true, provider: 'otakugifs' };
    },
    async () => {
      if (REACTION_FALLBACK.includes(action)) throw new Error('purrbot lacks this reaction');
      const d = await fetchJson(`https://api.purrbot.site/v2/img/sfw/${action}/gif`, { headers: UA, timeout: 15_000 });
      if (!d.link || d.error) throw new Error('no purrbot link');
      return { url: d.link, gif: true, provider: 'purrbot' };
    },
  ]);
}

export async function animeImage(kind = 'neko') {
  return firstOf([
    async () => {
      const d = await fetchJson(`https://api.purrbot.site/v2/img/sfw/${kind}/gif`, { headers: UA, timeout: 15_000 });
      if (!d.link || d.error) throw new Error('no purrbot image');
      return { url: d.link, provider: 'purrbot' };
    },
    async () => {
      const d = await fetchJson(`https://api.otakugifs.xyz/gif?reaction=blush`, { headers: UA, timeout: 15_000 });
      if (!d.url) throw new Error('no otakugifs image');
      return { url: d.url, provider: 'otakugifs' };
    },
  ]);
}
