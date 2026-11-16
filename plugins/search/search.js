import { fetchJson, firstOf } from '../../src/lib/http.js';
import { row } from '../../src/lib/ui.js';

const UA = { 'user-agent': 'NOVA-MD/1.2 (+https://github.com)' };
const cut = (s = '', n = 700) => {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
const frame = (title, lines) => [`┏❐ 《 ${title} 》 ❐`, ...lines, '┗❐'].join('\n');

/** Shared wrapper: uniform errors, no stack traces leaking into chat. */
const search = ({ name, aliases = [], description, usage, cooldownMs = 4000, run }) => ({
  name, aliases, description, usage, cooldownMs, category: 'search',
  async run(ctx) {
    if (!String(ctx.argsText || '').trim()) return ctx.reply({ text: `Usage: ${ctx.prefix}${ctx.command} ${usage}` });
    try { await run(ctx); }
    catch (err) { await ctx.reply({ text: `❌ ${cut(err.message, 300)}` }); }
  },
});

export default [
  search({
    name: 'wiki', aliases: ['wikipedia'], description: 'Wikipedia summary', usage: '<topic>',
    async run({ argsText, reply }) {
      const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(argsText.replace(/ /g, '_'))}?redirect=true`, { headers: UA });
      if (data.type === 'disambiguation') return reply({ text: `❓ *${data.title}* is ambiguous — try something more specific.` });
      await reply({
        text: `${frame('ᴡɪᴋɪᴘᴇᴅɪᴀ', [
          row('title', data.title),
          row('summary', cut(data.extract, 800)),
          data.content_urls?.desktop?.page ? row('source', data.content_urls.desktop.page) : '',
        ].filter(Boolean))}`,
      });
    },
  }),

  search({
    name: 'npm', aliases: ['package'], description: 'npm package details', usage: '<package>',
    async run({ argsText, reply }) {
      const d = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(argsText.trim())}/latest`, { headers: UA });
      await reply({
        text: frame('ɴᴘᴍ', [
          row('name', `${d.name}@${d.version}`),
          row('about', cut(d.description || '—', 300)),
          row('license', d.license || '—'),
          row('deps', String(Object.keys(d.dependencies || {}).length)),
          row('home', d.homepage || (d.repository?.url || '—').replace(/^git\+/, '')),
        ]),
      });
    },
  }),

  search({
    name: 'github', aliases: ['gh'], description: 'Search GitHub repositories', usage: '<query>',
    async run({ argsText, reply }) {
      const d = await fetchJson(`https://api.github.com/search/repositories?q=${encodeURIComponent(argsText)}&sort=stars&per_page=5`, { headers: UA });
      if (!d.items?.length) return reply({ text: 'No repositories found.' });
      const lines = d.items.map((r, i) =>
        `${i + 1}. *${r.full_name}*\n    ⭐ ${r.stargazers_count} · ${r.language || '—'} · ${r.open_issues_count} issues\n    ${r.html_url}`);
      await reply({ text: `${frame('ɢɪᴛʜᴜʙ', [lines.join('\n\n')])}` });
    },
  }),

  search({
    name: 'define', aliases: ['dict', 'meaning'], description: 'Dictionary definition', usage: '<word>',
    async run({ argsText, reply }) {
      const d = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(argsText.trim())}`, { headers: UA });
      const entry = d[0];
      const meanings = (entry.meanings || []).slice(0, 3).map((m) =>
        `┣◆ _${m.partOfSpeech}_ — ${cut(m.definitions?.[0]?.definition, 200)}`);
      await reply({
        text: frame(`ᴅᴇꜰɪɴᴇ · ${entry.word}`, [
          entry.phonetic ? row('say', entry.phonetic) : '',
          ...meanings,
        ].filter(Boolean)),
      });
    },
  }),

  search({
    name: 'book', aliases: ['books'], description: 'Search Open Library', usage: '<title or author>',
    async run({ argsText, reply }) {
      const d = await fetchJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(argsText)}&limit=5&fields=title,author_name,first_publish_year,key`, { headers: UA });
      if (!d.docs?.length) return reply({ text: 'No books found.' });
      const lines = d.docs.map((b, i) =>
        `${i + 1}. *${b.title}* — ${(b.author_name || ['unknown']).slice(0, 2).join(', ')} (${b.first_publish_year || '—'})\n    openlibrary.org${b.key}`);
      await reply({ text: frame('ᴏᴘᴇɴ ʟɪʙʀᴀʀʏ', [lines.join('\n\n')]) });
    },
  }),

  search({
    name: 'tv', aliases: ['show', 'series'], description: 'TV show lookup', usage: '<show name>',
    async run({ argsText, reply }) {
      const d = await fetchJson(`https://api.tvmaze.com/search/shows?q=${encodeURIComponent(argsText)}`, { headers: UA });
      const s = d[0]?.show;
      if (!s) return reply({ text: 'No show found.' });
      await reply({
        text: frame('ᴛᴠ ꜱʜᴏᴡ', [
          row('name', s.name),
          row('genres', (s.genres || []).join(', ') || '—'),
          row('premiered', s.premiered || '—'),
          row('rating', s.rating?.average ? `${s.rating.average}/10` : '—'),
          row('about', cut((s.summary || '').replace(/<[^>]+>/g, ''), 500)),
          row('link', s.url),
        ]),
      });
    },
  }),

  search({
    name: 'news', description: 'Headlines from Google News', usage: '[topic]',
    async run({ argsText, reply }) {
      const q = argsText.trim() || 'world';
      const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-NG&gl=NG&ceid=NG:en`, { headers: UA, signal: AbortSignal.timeout(12_000) });
      if (!res.ok) throw new Error(`news feed returned HTTP ${res.status}`);
      const xml = await res.text();
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 6).map((m) => {
        const title = m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] || '';
        const src = m[1].match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || '';
        return { title: title.replace(/&amp;/g, '&').trim(), src };
      });
      if (!items.length) return reply({ text: 'No headlines for that topic.' });
      await reply({
        text: frame(`ɴᴇᴡꜱ · ${q}`,
          items.map((i, n) => `${n + 1}. ${cut(i.title, 120)}${i.src ? `\n    _${i.src}_` : ''}`)),
      });
    },
  }),

  search({
    name: 'crypto', aliases: ['coin'], description: 'Crypto price', usage: '<coin id> (bitcoin, ethereum…)',
    async run({ argsText, reply }) {
      const id = argsText.trim().toLowerCase().replace(/\s+/g, '-');
      const d = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd,ngn&include_24hr_change=true`, { headers: UA });
      const c = d[id];
      if (!c) return reply({ text: `No coin called *${id}*. Try bitcoin, ethereum, solana, dogecoin.` });
      const change = c.usd_24h_change ?? 0;
      await reply({
        text: frame('ᴄʀʏᴘᴛᴏ', [
          row('coin', id),
          row('usd', `$${c.usd?.toLocaleString() ?? '—'}`),
          row('ngn', c.ngn ? `₦${c.ngn.toLocaleString()}` : '—'),
          row('24h', `${change >= 0 ? '📈 +' : '📉 '}${change.toFixed(2)}%`),
        ]),
      });
    },
  }),

  search({
    name: 'currency', aliases: ['fx', 'rate'], description: 'Exchange rates', usage: '<amount> <FROM> <TO>',
    async run({ argsText, reply }) {
      const parts = argsText.trim().toUpperCase().split(/\s+/);
      let amount = 1, from = 'USD', to = 'NGN';
      if (parts.length >= 3) { amount = Number(parts[0]) || 1; from = parts[1]; to = parts[2]; }
      else if (parts.length === 2) { [from, to] = parts; }
      else if (parts.length === 1 && /^[A-Z]{3}$/.test(parts[0])) { to = parts[0]; }

      const d = await fetchJson(`https://open.er-api.com/v6/latest/${from}`, { headers: UA });
      const rate = d.rates?.[to];
      if (!rate) throw new Error(`No rate for ${from} → ${to}`);
      await reply({
        text: frame('ꜰx', [
          row('from', `${amount.toLocaleString()} ${from}`),
          row('to', `${(amount * rate).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${to}`),
          row('rate', `1 ${from} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${to}`),
          row('as of', d.time_last_update_utc?.slice(0, 16) || '—'),
        ]),
      });
    },
  }),

  search({
    name: 'ip', aliases: ['ipinfo'], description: 'IP address lookup', usage: '[ip or blank for this host]',
    async run({ argsText, reply }) {
      const target = argsText.trim();
      const d = await fetchJson(`https://ipwho.is/${encodeURIComponent(target)}`, { headers: UA });
      if (d.success === false) throw new Error(d.message || 'lookup failed');
      await reply({
        text: frame('ɪᴘ ʟᴏᴏᴋᴜᴘ', [
          row('ip', d.ip),
          row('type', d.type || '—'),
          row('where', [d.city, d.region, d.country].filter(Boolean).join(', ') || '—'),
          row('isp', cut(d.connection?.isp || '—', 60)),
          row('tz', d.timezone?.id || '—'),
          row('coords', d.latitude ? `${d.latitude}, ${d.longitude}` : '—'),
        ]),
      });
    },
  }),

  search({
    name: 'lyrics', description: 'Song lyrics', usage: '<artist> - <title>',
    async run({ argsText, reply }) {
      const raw = argsText.trim();
      const [artist, title] = raw.includes(' - ') ? raw.split(/\s+-\s+/) : [raw.split(/\s+/)[0], raw.split(/\s+/).slice(1).join(' ')];
      if (!title) return reply({ text: 'Usage: .lyrics Coldplay - Yellow' });
      const d = await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, { headers: UA });
      const text = cut(d.lyrics, 2200);
      await reply({ text: `🎤 *${title}* — _${artist}_\n\n${text}` });
    },
  }),
];
