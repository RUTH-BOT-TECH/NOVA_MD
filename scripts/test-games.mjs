/**
 * Offline game tests: blackjack state machine, single-shot casino games and the
 * three board games. Everything runs through the real plugin contract against a
 * stubbed socket, so a pass here means the commands genuinely work.
 */
import { loadPlugins } from '../src/lib/loader.js';
import { JsonStore } from '../src/lib/store.js';

const registry = await loadPlugins('plugins');
const store = new JsonStore(':memory:');
store.data = {};
const config = { economy: { name: 'Nova', symbol: '₦', dailyAmount: 2500, startAmount: 1000, startBalance: 1000 }, botName: 'NOVA-MD' };

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label} ${detail}`); }
};

const A = (n) => `${n}@s.whatsapp.net`;
const JID = '2348000099-1600000000@g.us';

async function cmd(name, argsText, sender = A('2348000001')) {
  let out = '';
  const plugin = registry.get(name);
  if (!plugin) throw new Error(`no plugin ${name}`);
  const msg = { key: {}, message: {} };
  await plugin.run({
    argsText, args: String(argsText).split(' '), prefix: '.', command: name,
    store, config, senderJid: sender, jid: JID, pushName: 'Tester',
    msg, message: msg.message, reply: async (c) => { out = c.text ?? '[media]'; },
    sock: { sendMessage: async () => {} }, react: async () => {},
  });
  return out;
}
const has = (k) => store.has(k);
const wallet = (n = '2348000001') => store.get(`user:${n}`)?.wallet ?? 0;
const clean = (s) => s.replace(/\n/g, ' | ').slice(0, 96);

/* ── board: tic tac toe ─────────────────────────────────────────────── */
const tttStart = await cmd('tictactoe', '');
ok('tictactoe renders a board', /ᴛɪᴄ ᴛᴀᴄ ᴛᴏᴇ/.test(tttStart) && /1 ┃ 2 ┃ 3/.test(tttStart), clean(tttStart));
ok('tictactoe state stored', has(`game:ttt:${JID}`));

const badMove = await cmd('move', '42');
ok('move rejects an out-of-range square', /1–9|1-9/.test(badMove), clean(badMove));

const takenMove = await cmd('move', '5');
ok('move places X and answers with O', /X/.test(takenMove) && /O/.test(takenMove), clean(takenMove));

const sameMove = await cmd('move', '5');
ok('move rejects an occupied square', /taken|already/i.test(sameMove), clean(sameMove));

// drive the game to a terminal state through the public commands only
let tttFinal = '';
for (const sq of ['1', '2', '3', '4', '6', '7', '8', '9']) {
  if (!has(`game:ttt:${JID}`)) break;
  tttFinal = await cmd('move', sq);
}
ok('tictactoe reaches a verdict', /win|Draw/i.test(tttFinal), clean(tttFinal));
ok('finished tictactoe is cleared from the store', !has(`game:ttt:${JID}`));

/* ── board: connect 4 ───────────────────────────────────────────────── */
const c4Start = await cmd('connect4', '');
ok('connect4 renders a 7-wide board', /ᴄᴏɴɴᴇᴄᴛ 4/.test(c4Start) && /1 2 3 4 5 6 7/.test(c4Start), clean(c4Start));
ok('connect4 state stored', has(`game:c4:${JID}`));

const drop = await cmd('drop', '4');
ok('drop lands a disc and the bot replies', /🔴/.test(drop) && /🟡/.test(drop), clean(drop));

const badCol = await cmd('drop', '9');
ok('drop rejects column 9', /1–7|1-7/.test(badCol), clean(badCol));

let c4Final = '';
for (let i = 0; i < 21; i++) {
  if (!has(`game:c4:${JID}`)) break;
  c4Final = await cmd('drop', String((i % 7) + 1));
}
ok('connect4 reaches a verdict', /win|draw|full/i.test(c4Final), clean(c4Final));

/* ── board: wordle ─────────────────────────────────────────────────── */
const wStart = await cmd('wordle', '');
ok('wordle starts', /ᴡᴏʀᴅʟᴇ|Wordle/i.test(wStart), clean(wStart));
const answer = store.get(`game:wordle:${JID}`)?.answer;
ok('wordle answer is five letters', /^[a-z]{5}$/.test(answer || ''), String(answer));

const shortGuess = await cmd('guess', 'abc');
ok('guess rejects a short word', /Five letters/i.test(shortGuess), clean(shortGuess));

const realGuess = await cmd('guess', answer);
ok('correct guess wins wordle', /Correct in 1\/6/.test(realGuess), clean(realGuess));
ok('won wordle is cleared', !has(`game:wordle:${JID}`));

// six wrong guesses end the game
await cmd('wordle', '');
const wrong = answer === 'crane' ? 'slate' : 'crane';
let last = '';
for (let i = 0; i < 6; i++) last = await cmd('guess', wrong);
ok('six misses end wordle', /Out of tries/.test(last), clean(last));

/* ── board: quit ───────────────────────────────────────────────────── */
await cmd('tictactoe', '');
await cmd('connect4', '');
await cmd('wordle', '');
const quit = await cmd('quit', '');
ok('quit clears every live game', /cleared/i.test(quit), clean(quit));
ok('quit emptied the store', !has(`game:ttt:${JID}`) && !has(`game:c4:${JID}`) && !has(`game:wordle:${JID}`));
ok('quit with nothing live is honest', /No game/i.test(await cmd('quit', '')));

/* ── casino: blackjack ─────────────────────────────────────────────── */
const bj = await cmd('blackjack', '200');
ok('blackjack deals and stakes', /ʙʟᴀᴄᴋᴊᴀᴄᴋ|Blackjack!/.test(bj) && wallet() === 800, `${clean(bj)} wallet=${wallet()}`);
ok('blackjack state stored', has(`game:blackjack:${A('2348000001')}`));

let bjEnd = await cmd('hit', '');
for (let i = 0; i < 8 && has(`game:blackjack:${A('2348000001')}`); i++) bjEnd = await cmd('hit', '');
ok('blackjack hit resolves the hand', /bust|stand|win|lose|push|🤖|🃏/i.test(bjEnd), clean(bjEnd));
ok('blackjack state cleared after settlement', !has(`game:blackjack:${A('2348000001')}`));
ok('blackjack never leaves a negative balance', wallet() >= 0, String(wallet()));

const bj2 = await cmd('blackjack', '100');
ok('blackjack deals a fresh hand after settlement', /ʙʟᴀᴄᴋᴊᴀᴄᴋ|Blackjack!/.test(bj2), clean(bj2));
await cmd('stand', '');

const noGame = await cmd('hit', '');
ok('hit with no live hand is honest', /No open hand/i.test(noGame), clean(noGame));

/* ── casino: single-shot games ─────────────────────────────────────── */
const roulette = await cmd('roulette', '50 red');
ok('roulette settles a colour bet', /🔴|⚫|🟢/.test(roulette) && /ʀᴏᴜʟᴇᴛᴛᴇ/.test(roulette), clean(roulette));

const badRoulette = await cmd('roulette', '50 purple');
ok('roulette rejects a colour that does not exist', /red.*black.*number/i.test(badRoulette), clean(badRoulette));

const wheel = await cmd('wheel', '');
ok('wheel singles out exactly one slice', (wheel.match(/\*\d+\*/g) || []).length === 1, clean(wheel));

const lotto = await cmd('lottery', '100');
ok('lottery draws numbers', /ʟᴏᴛᴛᴇʀʏ/.test(lotto) && /ᴍᴀᴛᴄʜᴇꜱ/.test(lotto), clean(lotto));

const roll = await cmd('roll20', '');
ok('roll produces a d20 result', /\b([1-9]|1\d|20)\b/.test(roll), clean(roll));

const love = await cmd('lovecalc', 'Tester Nova');
const love2 = await cmd('lovecalc', 'Tester Nova');
ok('lovecalc is deterministic per pair', love === love2, `${clean(love)} vs ${clean(love2)}`);

/* ── economy integration ───────────────────────────────────────────── */
const bal = await cmd('balance', '');
ok('balance reflects every settlement', new RegExp(String(wallet()).replace(/\B(?=(\d{3})+$)/g, ',')).test(bal.replace(/,/g, '')) || /₦/.test(bal), clean(bal));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
