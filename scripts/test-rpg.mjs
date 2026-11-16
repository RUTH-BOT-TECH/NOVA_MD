/**
 * Offline tests for the shop / inventory / farm / jobs / rank layer. Growth is
 * fast-forwarded by rewinding the stored plant time, so no test waits minutes.
 */
import { loadPlugins } from '../src/lib/loader.js';
import { JsonStore } from '../src/lib/store.js';
import { ITEMS } from '../plugins/economy/rpg.js';
import { sc } from '../src/lib/ui.js';

const registry = await loadPlugins('plugins');
const store = new JsonStore(':memory:');
store.data = {};
const config = { economy: { name: 'Nova', symbol: '₦', dailyAmount: 2500, startBalance: 1000, startAmount: 1000 }, botName: 'NOVA-MD' };

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label} ${detail}`); }
};

const FARMER = '2348000005@s.whatsapp.net';
const A = '2348000006@s.whatsapp.net'; // the one with money

async function cmd(name, argsText, sender = A) {
  let out = '';
  const plugin = registry.get(name);
  if (!plugin) throw new Error(`no plugin ${name}`);
  const msg = { key: {}, message: {} };
  await plugin.run({
    argsText, args: String(argsText).split(' '), prefix: '.', command: name,
    store, config, senderJid: sender, jid: 'g@g.us', pushName: 'Tester',
    msg, message: msg.message, reply: async (c) => { out = c.text ?? '[media]'; },
    sock: { sendMessage: async () => {} }, react: async () => {},
  });
  return out;
}
const acc = (jid = A) => store.get(`user:${jid.split('@')[0]}`);
const clean = (s) => s.replace(/\n/g, ' | ').slice(0, 100);

/* ── shop ─────────────────────────────────────────────────────────── */
const shop = await cmd('shop');
ok('shop lists every item with a price', Object.values(ITEMS).every((it) => shop.includes(sc(it.label))) && /₦/.test(shop), clean(shop));

/* ── buy ──────────────────────────────────────────────────────────── */
await cmd('daily'); // give A a real balance
const before = acc().wallet;
const bought = await cmd('buy', 'wheat_seed 2');
ok('buy debits 80 for two wheat seeds', acc().wallet === before - ITEMS.wheat_seed.price * 2, `${before} → ${acc().wallet}`);
ok('buy adds to the inventory', acc().items.wheat_seed === 2, JSON.stringify(acc().items));
ok('buy confirms the purchase', /ʙᴏᴜɢʜᴛ|bought/i.test(bought), clean(bought));

ok('buy rejects an unknown item', /Usage/.test(await cmd('buy', 'dragon')));
ok('buy refuses more than the wallet holds', /❌/.test(await cmd('buy', 'coder 20')) || /❌/.test(await cmd('buy', 'watering_can 20')));

/* ── inventory + sell ─────────────────────────────────────────────── */
const inv = await cmd('inventory');
ok('inventory shows what is held', inv.includes(sc(ITEMS.wheat_seed.label)) && /×2/.test(inv), clean(inv));
ok('inventory is honest when empty', /Empty/.test(await cmd('inventory', '', '2348000009@s.whatsapp.net')));

const cashBeforeSell = acc().wallet;
const sold = await cmd('sell', 'wheat_seed 1');
ok('sell pays 60% of list price', acc().wallet === cashBeforeSell + Math.floor(ITEMS.wheat_seed.price * 0.6), clean(sold));
ok('sell removes the stock', acc().items.wheat_seed === 1);
ok('sell refuses stock you do not hold', /Usage/.test(await cmd('sell', 'corn_seed 1')));

/* ── jobs ─────────────────────────────────────────────────────────── */
const jobs = await cmd('jobs');
ok('jobs lists all three roles', ['driver', 'chef', 'coder'].every((r) => jobs.includes(sc(r))), clean(jobs));
ok('job shift without a job is honest', /Take a job/.test(await cmd('job', 'shift', '2348000010@s.whatsapp.net')));

const hired = await cmd('job', 'coder');
ok('job hires you', /ʜɪʀᴇᴅ|hired/i.test(hired) && store.get(`job:${A}`).role === 'coder', clean(hired));

const cashBeforeShift = acc().wallet;
const shift = await cmd('job', 'shift');
ok('shift pays the role rate', acc().wallet === cashBeforeShift + 1400, clean(shift));
ok('shift awards xp', (acc().xp || 0) >= 12, String(acc().xp));
ok('shift enforces the cooldown', /resting/i.test(await cmd('job', 'shift')));
ok('unknown job is rejected', /Unknown job/.test(await cmd('job', 'astronaut')));

/* ── farm ─────────────────────────────────────────────────────────── */
ok('plant without a seed is honest', /No wheat_seed/.test(await cmd('plant', 'wheat_seed', FARMER)));
ok('farm is empty before planting', /Nothing planted/.test(await cmd('farm', '', FARMER)));

await cmd('buy', 'wheat_seed 1', FARMER);
const planted = await cmd('plant', 'wheat_seed', FARMER);
ok('plant consumes the seed and starts a plot', /ᴘʟᴀɴᴛᴇᴅ|planted/i.test(planted) && store.has(`farm:${FARMER}`), clean(planted));
ok('planted seed left the bag', !store.get(`user:2348000005`).items.wheat_seed);
ok('farm shows it growing', /growing/i.test(await cmd('farm', '', FARMER)));
ok('harvest too early is refused', /needs .* more min/i.test(await cmd('harvest', '', FARMER)));
ok('a second plant is refused while growing', /already growing/i.test(await cmd('plant', 'wheat_seed', FARMER)));

// fast-forward the plot past its grow window
const plot = store.get(`farm:${FARMER}`);
store.set(`farm:${FARMER}`, { ...plot, planted: Date.now() - 4 * 60_000 });
const cashBeforeHarvest = store.get('user:2348000005').wallet;
const harvested = await cmd('harvest', '', FARMER);
ok('harvest pays the crop yield', store.get('user:2348000005').wallet === cashBeforeHarvest + 180, clean(harvested));
ok('harvest clears the plot', !store.has(`farm:${FARMER}`));

/* ── rank ─────────────────────────────────────────────────────────── */
const rank = await cmd('rank');
ok('rank lists accounts by xp', /ʀᴀɴᴋ|rank/i.test(rank) && /xp/.test(rank), clean(rank));
ok('rank marks the caller', /←you|you/.test(rank), clean(rank));

/* ── one wallet everywhere ────────────────────────────────────────── */
const balance = await cmd('balance');
const shown = Number(balance.replace(/[^\d]/g, ''));
ok('balance agrees with the stored wallet', balance.includes(acc().wallet.toLocaleString()), `${clean(balance)} vs ${acc().wallet}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
