import { fetchJson, firstOf } from '../../src/lib/http.js';
import { row } from '../../src/lib/ui.js';

/**
 * Faith commands.
 *
 * The verse text is embedded (King James Version — public domain) so it works
 * with zero network access. Prayer times and qibla come from the Aladhan API,
 * which is free and keyless.
 */

const VERSES = [
  { ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.' },
  { ref: 'Psalm 23:1', text: 'The LORD is my shepherd; I shall not want.' },
  { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.' },
  { ref: 'Romans 8:28', text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.' },
  { ref: 'Proverbs 3:5', text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.' },
  { ref: 'Isaiah 41:10', text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.' },
  { ref: 'Matthew 11:28', text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.' },
  { ref: 'Joshua 1:9', text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.' },
  { ref: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
  { ref: '1 Corinthians 13:4', text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.' },
  { ref: 'Hebrews 11:1', text: 'Now faith is the substance of things hoped for, the evidence of things not seen.' },
  { ref: 'Psalm 119:105', text: 'Thy word is a lamp unto my feet, and a light unto my path.' },
  { ref: 'John 14:6', text: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.' },
  { ref: 'Romans 12:2', text: 'And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.' },
  { ref: 'Ephesians 2:8', text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.' },
  { ref: '1 Peter 5:7', text: 'Casting all your care upon him; for he careth for you.' },
  { ref: 'Psalm 27:1', text: 'The LORD is my light and my salvation; whom shall I fear? the LORD is the strength of my life; of whom shall I be afraid?' },
  { ref: 'Matthew 6:33', text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.' },
  { ref: 'Galatians 5:22', text: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith.' },
];

const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

async function geocode(city) {
  const d = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const hit = d.results?.[0];
  if (!hit) throw new Error(`I could not find a place called "${city}".`);
  return { name: `${hit.name}, ${hit.country_code}`, lat: hit.latitude, lon: hit.longitude, tz: hit.timezone };
}

export default [
  {
    name: 'verse',
    aliases: ['bible', 'scripture'],
    category: 'faith',
    description: 'A verse from the King James Bible',
    usage: '.verse  ·  .verse John 3:16',
    async run({ argsText, reply }) {
      const query = String(argsText || '').trim().toLowerCase();
      const hit = query
        ? VERSES.find((v) => v.ref.toLowerCase() === query) || VERSES.find((v) => v.ref.toLowerCase().startsWith(query))
        : VERSES[Math.floor(Math.random() * VERSES.length)];

      if (!hit) {
        return reply({ text: `I don't have that verse stored. Try one of:\n${VERSES.slice(0, 6).map((v) => `• ${v.ref}`).join('\n')}\n…or just .verse for a random one.` });
      }
      await reply({ text: `📖 *${hit.ref}* (KJV)\n\n_${hit.text}_` });
    },
  },

  {
    name: 'prayer',
    aliases: ['salah', 'salat', 'prayertimes'],
    category: 'faith',
    description: 'Prayer times for a city',
    usage: '.prayer Lagos  ·  .prayer (uses DEFAULT_CITY)',
    cooldownMs: 4000,
    async run({ argsText, reply, config }) {
      const city = String(argsText || '').trim() || config.defaultCity;
      if (!city) return reply({ text: 'Usage: .prayer <city>  (or set DEFAULT_CITY in .env)' });
      try {
        const place = await geocode(city);
        const d = await firstOf([
          async () => {
            const r = await fetchJson(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=&method=2`);
            return r.data;
          },
          async () => {
            const r = await fetchJson(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now() / 1000)}?latitude=${place.lat}&longitude=${place.lon}&method=2`);
            return r.data;
          },
        ]);
        const t = d.timings;
        await reply({
          text: [
            `┏❐ 《 ꜱᴀʟᴀʜ · ${place.name} 》 ❐`,
            ...PRAYERS.map((p) => row(p.toLowerCase(), (t[p] || '—').split(' ')[0])),
            row('date', `${d.date?.readable || '—'} · ${d.date?.hijri?.day} ${d.date?.hijri?.month?.en || ''}`),
            '┗❐',
            '_method: Muslim World League (Fajr/Isha 18°)_',
          ].join('\n'),
        });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },

  {
    name: 'qibla',
    aliases: ['qiblah'],
    category: 'faith',
    description: 'Qibla direction for a city',
    usage: '.qibla Lagos',
    cooldownMs: 4000,
    async run({ argsText, reply, config }) {
      const city = String(argsText || '').trim() || config.defaultCity;
      if (!city) return reply({ text: 'Usage: .qibla <city>' });
      try {
        const place = await geocode(city);
        const d = await fetchJson(`https://api.aladhan.com/v1/qibla/${place.lat}/${place.lon}`);
        const deg = Number(d.data.direction);
        const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg/45) % 8];
        await reply({
          text: [
            `┏❐ 《 ǫɪʙʟᴀ · ${place.name} 》 ❐`,
            row('bearing', `${deg.toFixed(1)}° ${compass}`),
            row('from', `${place.lat.toFixed(3)}, ${place.lon.toFixed(3)}`),
            row('faces', 'towards the Kaaba, Makkah'),
            '┗❐',
            '_hold your compass so north matches, then turn to the bearing_',
          ].join('\n'),
        });
      } catch (err) {
        await reply({ text: `❌ ${err.message.slice(0, 200)}` });
      }
    },
  },
];
