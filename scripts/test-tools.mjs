/**
 * Offline tests for the cipher / sky / clock batch. Everything here computes
 * locally, so the assertions check real maths rather than a mock.
 */
import { loadPlugins } from '../src/lib/loader.js';
import { JsonStore } from '../src/lib/store.js';

const registry = await loadPlugins('plugins');
const store = new JsonStore(':memory:');
store.data = {};
const config = { economy: { name: 'Nova', symbol: '₦', dailyAmount: 2500, startBalance: 1000 }, botName: 'NOVA-MD' };

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label} ${detail}`); }
};

const JID = '2348000077-1600000000@g.us';
const sent = [];

async function cmd(name, argsText) {
  let out = '';
  const plugin = registry.get(name);
  if (!plugin) throw new Error(`no plugin ${name}`);
  const msg = { key: {}, message: {} };
  await plugin.run({
    argsText, args: String(argsText).split(' '), prefix: '.', command: name,
    store, config, senderJid: '2348000002@s.whatsapp.net', jid: JID, pushName: 'Tester',
    msg, message: msg.message, reply: async (c) => { out = c.text ?? '[media]'; },
    sock: { sendMessage: async (j, c) => { sent.push({ j, c }); } }, react: async () => {},
  });
  return out;
}
const clean = (s) => s.replace(/\n/g, ' | ').slice(0, 100);

/* ── ciphers ───────────────────────────────────────────────────────── */
const payloadLine = await cmd('encrypt', 'meet me at the jetty');
const payload = payloadLine.match(/v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0];
ok('encrypt returns a v1 payload', Boolean(payload), clean(payloadLine));

const plain = await cmd('decrypt', payload || 'x');
ok('decrypt round-trips the original text', /meet me at the jetty/.test(plain), clean(plain));

const tampered = payload ? payload.slice(0, -4) + 'AAAA' : 'v1.a.b.c';
ok('decrypt rejects a tampered payload', /❌/.test(await cmd('decrypt', tampered)));

ok('decrypt rejects junk', /❌/.test(await cmd('decrypt', 'not-a-payload')));

const vig = await cmd('vigenere', 'lemon ATTACK at dawn!');
ok('vigenere encodes', /LXFOPV/.test(vig), clean(vig));
const vigBack = await cmd('vigenere', '-d lemon LXFOPV EF RNHR!');
ok('vigenere decodes back to plaintext', /ATTACK at dawn/i.test(vigBack), clean(vigBack));
ok('vigenere needs a word key', /❌/.test(await cmd('vigenere', '123 hello')));

const nato = await cmd('phonetic', 'NOVA 42');
ok('phonetic spells in NATO words', /November/.test(nato) && /Victor/.test(nato) && /Four/.test(nato), clean(nato));

/* ── geography + sky ───────────────────────────────────────────────── */
// Lagos → Abuja is ~532 km on the great circle
const dist = await cmd('distance', '6.5244,3.3792 9.0765,7.3986');
const km = Number(dist.match(/ᴋᴍ : ([\d.]+)/)?.[1] ?? dist.match(/km : ([\d.]+)/)?.[1]);
ok('distance Lagos→Abuja is ~530 km', km > 500 && km < 560, `got ${km} — ${clean(dist)}`);
ok('distance rejects half a coordinate pair', /Usage/.test(await cmd('distance', '6.5,3.3')));

// a full moon really is a full moon: 2026-01-03 was one
const fullMoon = await cmd('moonphase', '2026-01-03');
ok('moonphase finds the January 2026 full moon', /Full moon/.test(fullMoon) && /9\d%|100%/.test(fullMoon), clean(fullMoon));
const newMoon = await cmd('moonphase', '2026-01-18');
ok('moonphase finds the new moon two weeks later', /New moon|Waning/.test(newMoon), clean(newMoon));

const leo = await cmd('zodiac', '1998-07-24');
ok('zodiac gives Leo for 24 July', /ʟᴇᴏ|Leo/.test(leo), clean(leo));
const cap = await cmd('zodiac', '1990-01-05');
ok('zodiac gives Capricorn for 5 January', /ᴄᴀᴘʀɪᴄᴏʀɴ|Capricorn/.test(cap), clean(cap));
ok('zodiac rejects a malformed date', /Usage/.test(await cmd('zodiac', '24-07-1998')));

const tarot = await cmd('tarot', '');
ok('tarot draws three named cards', (tarot.match(/┣◆/g) || []).length === 3, clean(tarot));

/* ── clocks ───────────────────────────────────────────────────────── */
const timerAck = await cmd('timer', '1s kettle');
ok('timer acknowledges and computes a fire time', /1s/.test(timerAck) && /ᴋᴇᴛᴛʟᴇ|kettle/i.test(timerAck), clean(timerAck));
ok('timer rejects a zero length', /Minimum/.test(await cmd('timer', '0s')));

const swStart = await cmd('stopwatch', 'start');
ok('stopwatch starts', /started/i.test(swStart), clean(swStart));
ok('stopwatch refuses a second start', /Already running/.test(await cmd('stopwatch', 'start')));
await new Promise((r) => setTimeout(r, 60));
const lap = await cmd('stopwatch', 'lap');
ok('stopwatch records a lap with a real duration', /ʟᴀᴘ 1|lap 1/.test(lap) && /\d+\.\d+s/.test(lap), clean(lap));
const stopped = await cmd('stopwatch', 'stop');
ok('stopwatch stops and reports total', /ᴛɪᴍᴇ|time/.test(stopped) && /\d+\.\d+s/.test(stopped), clean(stopped));
ok('stopwatch state cleared after stop', !store.has(`stopwatch:${JID}`));
ok('stopwatch after stop is honest', /No stopwatch/.test(await cmd('stopwatch', 'lap')));

/* ── quiz + race ───────────────────────────────────────────────────── */
const triviaQ = await cmd('trivia', '');
ok('trivia posts a question with four options', (triviaQ.match(/┣◆/g) || []).length === 4, clean(triviaQ));
const triviaState = store.get(`trivia:${JID}`);
ok('trivia stores the dealt options', Array.isArray(triviaState.options) && triviaState.options.length === 4);
const correctIndex = triviaState.options.findIndex((o) => o.correct) + 1;
const triviaA = await cmd('trivia', String(correctIndex));
ok('correct answer is accepted', /Correct/.test(triviaA), clean(triviaA));
ok('trivia state cleared after answering', !store.has(`trivia:${JID}`));

const raceQ = await cmd('typerace', '');
const line = store.get(`typerace:${JID}`).line;
ok('typerace hands over a line', line.length > 10 && /Type this back/.test(raceQ), String(line));
const race = await cmd('typerace', line);
ok('typerace scores an exact match', /✅ exact/.test(race) && /100%/.test(race) && /wpm/.test(race), clean(race));
ok('typerace state cleared after the run', !store.has(`typerace:${JID}`));

/* ── the timer that was armed at the top ───────────────────────────── */
await new Promise((r) => setTimeout(r, 1200));
const fired = sent.find((s) => /Timer done/.test(s.c?.text || ''));
ok('timer actually fires into the chat', Boolean(fired) && fired.j === JID, JSON.stringify(sent.map((s) => s.c.text?.slice(0, 20))));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
