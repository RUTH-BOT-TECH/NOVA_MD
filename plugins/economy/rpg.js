import { account, save, fmt, ecoKey } from '../../src/lib/economy.js';
import { bareJid } from '../../src/lib/message.js';
import { row, sc } from '../../src/lib/ui.js';

/**
 * A small economy game layer on top of the shared wallet: a shop, an
 * inventory, three farm crops on real timers, three jobs and an XP board.
 * Every figure is derived from the same account the economy plugins use, so
 * `.balance`, `.farm` and `.rank` never disagree.
 */

const frame = (title, lines) => [`┏❐ 《 ${sc(title)} 》 ❐`, ...lines, '┗❐'].join('\n');
const count = (n) => Number(n) || 1;

export const ITEMS = {
  wheat_seed: { label: 'Wheat seed', price: 40, kind: 'seed' },
  corn_seed: { label: 'Corn seed', price: 90, kind: 'seed' },
  tomato_seed: { label: 'Tomato seed', price: 150, kind: 'seed' },
  watering_can: { label: 'Watering can', price: 400, kind: 'tool' },
  hoe: { label: 'Hoe', price: 250, kind: 'tool' },
  lock: { label: 'Padlock', price: 600, kind: 'tool' },
};

const CROPS = {
  wheat_seed: { name: 'Wheat', growMs: 3 * 60_000, yield: 180, seed: 1 },
  corn_seed: { name: 'Corn', growMs: 8 * 60_000, yield: 420, seed: 1 },
  tomato_seed: { name: 'Tomatoes', growMs: 15 * 60_000, yield: 900, seed: 1 },
};

const JOBS = {
  driver: { pay: 900, cooldownMs: 45 * 60_000, blurb: 'cross-town deliveries' },
  chef: { pay: 650, cooldownMs: 30 * 60_000, blurb: 'service work with knives' },
  coder: { pay: 1400, cooldownMs: 60 * 60_000, blurb: 'compile, patch, repeat' },
};

const FARM = (jid) => `farm:${jid}`;
const JOB = (jid) => `job:${jid}`;
const has = (store, key) => (store.has(key) ? store.get(key) : null);
const asList = (items = {}) => Object.entries(items).filter(([, n]) => n > 0);

export default [
  {
    name: 'shop',
    category: 'economy',
    description: 'What the shop sells',
    usage: '.shop',
    async run({ reply, config }) {
      const lines = Object.entries(ITEMS).map(([, it]) => row(it.label, fmt(it.price, config)));
      await reply({ text: frame('shop', [...lines, `┃ ${sc('buy')} : .buy <item> [qty]`]) });
    },
  },

  {
    name: 'buy',
    category: 'economy',
    description: 'Buy something from the shop',
    usage: '.buy wheat_seed 3',
    async run({ argsText, reply, store, senderJid, config }) {
      const [raw, qtyRaw] = String(argsText).trim().toLowerCase().split(/\s+/);
      const key = raw && Object.keys(ITEMS).find((k) => k === raw || ITEMS[k].label.toLowerCase().replace(/\s+/g, '_') === raw);
      if (!key) return reply({ text: 'Usage: .buy <item> [qty]  — see *.shop*' });
      const qty = Math.max(1, Math.min(20, count(qtyRaw)));
      const cost = ITEMS[key].price * qty;
      const acc = account(store, senderJid, config);
      if (acc.wallet < cost) return reply({ text: `❌ ${fmt(cost, config)} needed — cash is ${fmt(acc.wallet, config)}.` });

      const items = { ...(acc.items || {}) };
      items[key] = (items[key] || 0) + qty;
      save(store, senderJid, { ...acc, wallet: acc.wallet - cost, items });
      await reply({
        text: frame('bought', [
          row('item', `${ITEMS[key].label} ×${qty}`),
          row('paid', fmt(cost, config)),
          row('cash', fmt(acc.wallet - cost, config)),
          row('held', String(items[key])),
        ]),
      });
    },
  },

  {
    name: 'sell',
    category: 'economy',
    description: 'Sell stock back at 60%',
    usage: '.sell corn_seed 2',
    async run({ argsText, reply, store, senderJid, config }) {
      const [raw, qtyRaw] = String(argsText).trim().toLowerCase().split(/\s+/);
      const acc = account(store, senderJid, config);
      const items = acc.items || {};
      const key = raw && Object.keys(ITEMS).find((k) => k === raw && items[k]);
      if (!key) return reply({ text: `Usage: .sell <item> [qty] — you hold ${asList(items).map(([k, n]) => `${k}×${n}`).join(', ') || 'nothing'}` });
      const held = items[key] || 0;
      const qty = Math.max(1, Math.min(held, count(qtyRaw)));
      const payout = Math.floor(ITEMS[key].price * 0.6) * qty;

      items[key] = held - qty;
      save(store, senderJid, { ...acc, wallet: acc.wallet + payout, items });
      await reply({ text: frame('sold', [row('item', `${ITEMS[key].label} ×${qty}`), row('earned', fmt(payout, config)), row('cash', fmt(acc.wallet + payout, config))]) });
    },
  },

  {
    name: 'inventory',
    aliases: ['inv', 'bag'],
    category: 'economy',
    description: 'What you are carrying',
    usage: '.inventory',
    async run({ reply, store, senderJid, config }) {
      const acc = account(store, senderJid, config);
      const list = asList(acc.items);
      if (!list.length) return reply({ text: '🎒 Empty. *.shop* → *.buy <item>*' });
      const lines = list.map(([k, n]) => row(ITEMS[k]?.label || k, `×${n}  ·  ${fmt((ITEMS[k]?.price || 0) * n * 0.6, config)}`));
      const total = list.reduce((sum, [k, n]) => sum + (ITEMS[k]?.price || 0) * n * 0.6, 0);
      await reply({ text: frame('inventory', [...lines, row('resale', fmt(total, config))]) });
    },
  },

  {
    name: 'jobs',
    category: 'economy',
    description: 'Jobs you can take',
    usage: '.jobs',
    async run({ reply, config }) {
      const lines = Object.entries(JOBS).map(([k, j]) => row(k, `${fmt(j.pay, config)} / ${Math.round(j.cooldownMs / 60000)}m — ${j.blurb}`));
      await reply({ text: frame('jobs', [...lines, `┃ ${sc('take')} : .job <name>`]) });
    },
  },

  {
    name: 'job',
    category: 'economy',
    description: 'Take a job and work a shift',
    usage: '.job coder  ·  .job shift',
    async run({ argsText, reply, store, senderJid, config }) {
      const arg = String(argsText).trim().toLowerCase();
      const state = has(store, JOB(senderJid));
      const acc = account(store, senderJid, config);

      if (!arg) {
        if (!state) return reply({ text: 'No job yet. *.jobs* → *.job coder*' });
        const job = JOBS[state.role];
        const ready = Date.now() - (state.lastShift || 0) >= job.cooldownMs;
        return reply({ text: frame('job', [row('role', state.role), row('pay', fmt(job.pay, config)), row('shift', ready ? 'ready — *.job shift*' : 'resting')]) });
      }

      if (arg === 'shift' || arg === 'work') {
        if (!state) return reply({ text: 'Take a job first — *.jobs*' });
        const job = JOBS[state.role];
        const waited = Date.now() - (state.lastShift || 0);
        if (waited < job.cooldownMs) {
          const left = Math.ceil((job.cooldownMs - waited) / 60000);
          return reply({ text: `😮‍💨 Still resting — ${left} min to go.` });
        }
        store.set(JOB(senderJid), { ...state, lastShift: Date.now() });
        save(store, senderJid, { ...acc, wallet: acc.wallet + job.pay, xp: (acc.xp || 0) + 12 });
        return reply({ text: frame('shift', [row('role', state.role), row('earned', `+${fmt(job.pay, config)}`), row('cash', fmt(acc.wallet + job.pay, config))]) });
      }

      if (!JOBS[arg]) return reply({ text: `Unknown job. Pick one of: ${Object.keys(JOBS).join(', ')}` });
      store.set(JOB(senderJid), { role: arg, lastShift: state?.lastShift || 0 });
      await reply({ text: frame('hired', [row('role', arg), row('pay', fmt(JOBS[arg].pay, config)), row('next', '`.job shift`')]) });
    },
  },

  {
    name: 'plant',
    aliases: ['sow'],
    category: 'economy',
    description: 'Plant a seed you own',
    usage: '.plant wheat_seed',
    async run({ argsText, reply, store, senderJid, config }) {
      const acc = account(store, senderJid, config);
      const items = acc.items || {};
      const key = String(argsText).trim().toLowerCase() || Object.keys(CROPS).find((k) => items[k]);
      const crop = CROPS[key];
      if (!crop) return reply({ text: 'Usage: .plant <wheat_seed|corn_seed|tomato_seed>' });
      const plot = has(store, FARM(senderJid));
      if (plot) return reply({ text: '🌱 Something is already growing here — *.harvest* it first.' });
      if (!items[key]) return reply({ text: `❌ No ${key} in your bag — *.buy ${key}*` });

      items[key] = items[key] - 1;
      save(store, senderJid, { ...acc, items });
      store.set(FARM(senderJid), { crop: key, planted: Date.now() });
      const mins = Math.round(crop.growMs / 60000);
      await reply({ text: frame('planted', [row('crop', crop.name), row('grows in', `${mins} min`), row('seeds left', String(items[key]))]) });
    },
  },

  {
    name: 'farm',
    category: 'economy',
    description: 'Look at your plot',
    usage: '.farm',
    async run({ reply, store, senderJid }) {
      const plot = has(store, FARM(senderJid));
      if (!plot) return reply({ text: '🌾 Nothing planted. *.buy wheat_seed* then *.plant wheat_seed*' });
      const crop = CROPS[plot.crop];
      const done = Date.now() - plot.planted >= crop.growMs;
      const mins = Math.max(0, Math.ceil((crop.growMs - (Date.now() - plot.planted)) / 60000));
      await reply({ text: frame('farm', [row('crop', crop.name), row('state', done ? 'ready — *.harvest*' : `growing · ${mins} min`), row('yield', `~${crop.yield}`)]) });
    },
  },

  {
    name: 'harvest',
    aliases: ['reap'],
    category: 'economy',
    description: 'Collect a finished crop',
    usage: '.harvest',
    async run({ reply, store, senderJid, config }) {
      const plot = has(store, FARM(senderJid));
      if (!plot) return reply({ text: '🌾 Nothing planted — *.plant <seed>*' });
      const crop = CROPS[plot.crop];
      const elapsed = Date.now() - plot.planted;
      if (elapsed < crop.growMs) {
        return reply({ text: `⏳ ${crop.name} needs ${Math.ceil((crop.growMs - elapsed) / 60000)} more min.` });
      }
      store.delete(FARM(senderJid));
      const acc = account(store, senderJid, config);
      save(store, senderJid, { ...acc, wallet: acc.wallet + crop.yield, xp: (acc.xp || 0) + 8 });
      await reply({ text: frame('harvest', [row('crop', crop.name), row('sold for', `+${fmt(crop.yield, config)}`), row('cash', fmt(acc.wallet + crop.yield, config))]) });
    },
  },

  {
    name: 'rank',
    aliases: ['xp'],
    category: 'economy',
    description: 'XP leaderboard for this deployment',
    usage: '.rank',
    async run({ reply, store, senderJid, config }) {
      const rows = store.entries('user:')
        .map(([key, acc]) => ({ who: key.replace('user:', ''), xp: acc?.xp || 0, wallet: acc?.wallet ?? 0 }))
        .sort((a, b) => b.xp - a.xp || b.wallet - a.wallet)
        .slice(0, 10);
      if (!rows.length) return reply({ text: 'No accounts yet — *.daily* starts yours.' });

      const medals = ['🥇', '🥈', '🥉'];
      const me = bareJid(senderJid);
      const lines = rows.map((r, i) => {
        const tag = r.who === me ? ' ←you' : '';
        return row(`${medals[i] || `${i + 1}.`} ${r.who.slice(0, 4)}…${r.who.slice(-3)}`, `${r.xp} xp · ${fmt(r.wallet, config)}${tag}`);
      });
      await reply({ text: frame('rank', lines) });
    },
  },
];
