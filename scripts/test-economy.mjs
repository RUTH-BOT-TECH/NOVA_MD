/** Offline economy tests: invariants, cooldowns, and theft maths. */
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

const A = (num) => `${num}@s.whatsapp.net`;
async function cmd(name, argsText, { sender = A('2348000001'), msg = { key: {}, message: {} } } = {}) {
  let out = '';
  const plugin = registry.get(name);
  if (!plugin) throw new Error(`no plugin ${name}`);
  await plugin.run({
    argsText, args: String(argsText).split(' '), prefix: '.', command: name,
    store, config, senderJid: sender, jid: 'g@g.us', pushName: 'Tester',
    msg, message: msg.message, reply: async (c) => { out = c.text ?? '[media]'; },
    sock: { sendMessage: async () => {} }, react: async () => {},
  });
  return out;
}
// accounts are keyed by BARE number (that is what the handler passes around)
const bal = (num) => {
  const a = store.get(`user:${num}`);
  return a ? { wallet: a.wallet, bank: a.bank, total: a.wallet + a.bank } : null;
};

// 1. opening balance
await cmd('balance');
ok('new account starts at 1000', bal('2348000001')?.wallet === 1000, JSON.stringify(bal('2348000001')));

// 2. daily, then cooldown
const d1 = await cmd('daily');
ok('daily pays', /Daily claimed/.test(d1) && bal('2348000001').wallet > 1000);
const d2 = await cmd('daily');
ok('daily cooldown blocks second claim', /Already claimed/.test(d2));
ok('streak recorded as 1', store.get('user:2348000001').streak === 1);

// 3. work + cooldown
const w1 = await cmd('work');
ok('work pays', /earned/.test(w1));
ok('work cooldown blocks repeat', /tired/.test(await cmd('work')));

// 4. deposit / withdraw round-trip conserves money
const before = bal('2348000001').total;
await cmd('deposit', '500');
ok('deposit moves cash → bank', bal('2348000001').bank === 500 && bal('2348000001').total === before);
await cmd('withdraw', 'all');
ok('withdraw returns everything', bal('2348000001').bank === 0 && bal('2348000001').total === before);
ok('over-deposit rejected', /only have/.test(await cmd('deposit', '999999')));

// 5. pay: amount leaves sender, 2% fee means recipient gets less
const senderBefore = bal('2348000001').wallet;
const quoted = {
  key: {}, message: {
    extendedTextMessage: {
      text: '.pay 500',
      contextInfo: { participant: A('2348000002'), stanzaId: 'ABC', quotedMessage: { conversation: 'hi' } },
    },
  },
};
await cmd('pay', '500', { msg: quoted });
const r = bal('2348000002');
ok('pay debits the sender exactly', bal('2348000001').wallet === senderBefore - 500, `${bal('2348000001').wallet} vs ${senderBefore - 500}`);
ok('pay credits recipient minus 2% fee', r.wallet === 1000 + 500 - 10, JSON.stringify(r));

// 6. rob: forced success and forced failure
const realRandom = Math.random;
Math.random = () => 0.9; // > 0.45 → success path
const victimBefore = bal('2348000002').wallet;
const robWin = await cmd('rob', '', { msg: quoted });
ok('rob succeeds and moves value', /Successful heist/.test(robWin) && bal('2348000002').wallet < victimBefore);
Math.random = () => 0.1; // < 0.45 → caught
const thiefBefore = bal('2348000003').wallet ?? null;
await cmd('balance', '', { sender: A('2348000003') });
const t0 = bal('2348000003').wallet;
await cmd('rob', '', { sender: A('2348000003'), msg: quoted });
ok('rob failure fines the thief', bal('2348000003').wallet < t0);
Math.random = realRandom;

// 7. gamble + slots never go negative and never invent money out of thin air
const g0 = bal('2348000001').wallet;
await cmd('gamble', '100');
const g1 = bal('2348000001').wallet;
ok('gamble moves by exactly the bet', Math.abs(g1 - g0) === 100, `${g0} → ${g1}`);
ok('slots rejects bets above balance', /Cash/.test(await cmd('slots', '99999999')));
await cmd('slots', '100');
ok('wallet never negative', Object.entries(store.data).filter(([k]) => k.startsWith('user:')).every(([, v]) => v.wallet >= 0 && v.bank >= 0));

// 8. leaderboard + reset
const board = await cmd('rich');
ok('leaderboard lists users', /ʀɪᴄʜᴇꜱᴛ/.test(board) && /┣◆/.test(board));
await cmd('ecoreset', 'all');
ok('ecoreset all wipes accounts', store.entries('user:').length === 0);

console.log(`\neconomy: ${pass}/${pass + fail} passed`);
if (fail) process.exitCode = 1;
