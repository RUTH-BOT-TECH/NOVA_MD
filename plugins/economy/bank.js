import { row, bar } from '../../src/lib/ui.js';
import { bareJid } from '../../src/lib/message.js';

/**
 * A small persistent economy. Everything lives in the JSON store under
 * `user:<jid>`, so balances survive restarts and `.rich` can rank everyone.
 * Nothing here is a stub: cooldowns are enforced, transfers are atomic,
 * and robbing can fail and cost you.
 */

const DAY = 86_400_000;
const key = (jid) => `user:${bareJid(jid)}`;

const fmt = (n, cfg) => `${cfg.economy.symbol}${Math.round(n).toLocaleString()}`;

function account(store, jid, cfg) {
  const existing = store.get(key(jid));
  if (existing && typeof existing.wallet === 'number') return existing;
  const fresh = { wallet: cfg.economy.startBalance, bank: 0, streak: 0, lastDaily: 0, lastWork: 0, lastBeg: 0, created: Date.now() };
  store.set(key(jid), fresh);
  return fresh;
}

const save = (store, jid, patch) => store.set(key(jid), patch);

/** Resolve a pay/rob target: reply → mention → number. Returns bare jid. */
function targetOf(argsText, msg) {
  const info = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo;
  const jid = info?.mentionedJid?.[0] || (info?.participant && info?.quotedMessage ? info.participant : null);
  if (jid) return bareJid(jid);
  const digits = String(argsText || '').match(/\d{7,15}/)?.[0];
  return digits || null;
}

const wait = (ms) => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h ? `${h}h ${m}m` : `${m}m`;
};

export default [
  {
    name: 'balance', aliases: ['bal', 'wallet', 'bank'],
    category: 'economy',
    description: 'Your wallet and bank balance',
    usage: '.balance',
    async run({ store, senderJid, reply, config }) {
      const a = account(store, senderJid, config);
      const total = a.wallet + a.bank;
      await reply({
        text: [
          '┏❐ 《 ᴡᴀʟʟᴇᴛ 》 ❐',
          row('cash', fmt(a.wallet, config)),
          row('bank', fmt(a.bank, config)),
          row('total', `*${fmt(total, config)}*`),
          row('streak', `${a.streak} day${a.streak === 1 ? '' : 's'}`),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'daily', aliases: ['claim'],
    category: 'economy',
    description: 'Claim your daily reward (streak multiplies it)',
    usage: '.daily',
    async run({ store, senderJid, reply, config }) {
      const a = account(store, senderJid, config);
      const since = Date.now() - (a.lastDaily || 0);
      if (since < DAY) return reply({ text: `⏳ Already claimed. Come back in *${wait(DAY - since)}*.` });

      const streak = since < 2 * DAY ? (a.streak || 0) + 1 : 1;
      const bonus = Math.min(streak, 7);
      const amount = Math.round(config.economy.dailyAmount * (1 + (bonus - 1) * 0.25));
      save(store, senderJid, { ...a, wallet: a.wallet + amount, streak, lastDaily: Date.now() });
      await reply({
        text: `🎁 *Daily claimed*\n\n┃ +${fmt(amount, config)}\n┃ streak : ${streak} day${streak === 1 ? '' : 's'} (×${(1 + (bonus - 1) * 0.25).toFixed(2)})\n┃ balance : ${fmt(a.wallet + amount, config)}`,
      });
    },
  },

  {
    name: 'work',
    category: 'economy',
    description: 'Do a job for coins (1h cooldown)',
    usage: '.work',
    async run({ store, senderJid, reply, config, pushName }) {
      const a = account(store, senderJid, config);
      const since = Date.now() - (a.lastWork || 0);
      if (since < 3_600_000) return reply({ text: `😮‍💨 You are tired. Rest *${wait(3_600_000 - since)}* first.` });

      const jobs = ['drove a keke', 'sold suya', 'fixed a laptop', 'wrote a bot command', 'stacked shelves', 'taught a class', 'designed a logo'];
      const amount = 300 + Math.floor(Math.random() * 900);
      save(store, senderJid, { ...a, wallet: a.wallet + amount, lastWork: Date.now() });
      await reply({ text: `🛠️ *${pushName || 'You'}* ${jobs[Math.floor(Math.random() * jobs.length)]}.\n┃ earned : +${fmt(amount, config)}\n┃ balance : ${fmt(a.wallet + amount, config)}` });
    },
  },

  {
    name: 'beg',
    category: 'economy',
    description: 'Beg for a little change (10m cooldown)',
    usage: '.beg',
    async run({ store, senderJid, reply, config }) {
      const a = account(store, senderJid, config);
      const since = Date.now() - (a.lastBeg || 0);
      if (since < 600_000) return reply({ text: `🙈 Nobody is listening yet. Try again in *${wait(600_000 - since)}*.` });

      const amount = 50 + Math.floor(Math.random() * 200);
      save(store, senderJid, { ...a, wallet: a.wallet + amount, lastBeg: Date.now() });
      await reply({ text: `🥺 Someone felt sorry for you.\n┃ received : +${fmt(amount, config)}\n┃ balance : ${fmt(a.wallet + amount, config)}` });
    },
  },

  {
    name: 'deposit', aliases: ['dep'],
    category: 'economy',
    description: 'Move cash into the bank (safer from robbery)',
    usage: '.deposit <amount|all>',
    async run({ store, senderJid, argsText, reply, config }) {
      const a = account(store, senderJid, config);
      const raw = argsText.trim().toLowerCase();
      const amount = raw === 'all' ? a.wallet : Math.floor(Number(raw));
      if (!Number.isFinite(amount) || amount <= 0) return reply({ text: 'Usage: .deposit <amount|all>' });
      if (amount > a.wallet) return reply({ text: `❌ You only have ${fmt(a.wallet, config)} in cash.` });
      save(store, senderJid, { ...a, wallet: a.wallet - amount, bank: a.bank + amount });
      await reply({ text: `🏦 Deposited ${fmt(amount, config)}\n┃ bank : ${fmt(a.bank + amount, config)}\n┃ cash : ${fmt(a.wallet - amount, config)}` });
    },
  },

  {
    name: 'withdraw', aliases: ['with'],
    category: 'economy',
    description: 'Move money out of the bank',
    usage: '.withdraw <amount|all>',
    async run({ store, senderJid, argsText, reply, config }) {
      const a = account(store, senderJid, config);
      const raw = argsText.trim().toLowerCase();
      const amount = raw === 'all' ? a.bank : Math.floor(Number(raw));
      if (!Number.isFinite(amount) || amount <= 0) return reply({ text: 'Usage: .withdraw <amount|all>' });
      if (amount > a.bank) return reply({ text: `❌ You only have ${fmt(a.bank, config)} in the bank.` });
      save(store, senderJid, { ...a, bank: a.bank - amount, wallet: a.wallet + amount });
      await reply({ text: `💵 Withdrew ${fmt(amount, config)}\n┃ cash : ${fmt(a.wallet + amount, config)}\n┃ bank : ${fmt(a.bank - amount, config)}` });
    },
  },

  {
    name: 'pay', aliases: ['transfer', 'give'],
    category: 'economy',
    description: 'Send money to someone (2% fee)',
    usage: '.pay @user 500  ·  reply with .pay 500',
    async run({ store, senderJid, argsText, msg, reply, config }) {
      const target = targetOf(argsText, msg);
      const amount = Math.floor(Number(String(argsText).match(/\d+/)?.[0]));
      if (!target || !amount) return reply({ text: 'Usage: .pay @user 500  (or reply to them)' });
      if (target === bareJid(senderJid)) return reply({ text: '🙃 You cannot pay yourself.' });
      if (amount < 10) return reply({ text: '⚠️ Minimum transfer is 10.' });

      const from = account(store, senderJid, config);
      if (from.wallet < amount) return reply({ text: `❌ Cash: ${fmt(from.wallet, config)} — you need ${fmt(amount, config)}.` });

      const to = account(store, `${target}@s.whatsapp.net`, config);
      const fee = Math.ceil(amount * 0.02);
      save(store, senderJid, { ...from, wallet: from.wallet - amount });
      save(store, `${target}@s.whatsapp.net`, { ...to, wallet: to.wallet + amount - fee });
      await reply({ text: `✅ Sent ${fmt(amount - fee, config)} to +${target}\n┃ fee : ${fmt(fee, config)} (2%)\n┃ balance : ${fmt(from.wallet - amount, config)}` });
    },
  },

  {
    name: 'rob',
    category: 'economy',
    description: 'Try to rob someone — you can get caught',
    usage: '.rob @user',
    cooldownMs: 60_000,
    async run({ store, senderJid, argsText, msg, reply, config }) {
      const target = targetOf(argsText, msg);
      if (!target) return reply({ text: 'Usage: .rob @user (or reply to them)' });
      if (target === bareJid(senderJid)) return reply({ text: '🤡 Robbing yourself?' });

      const thief = account(store, senderJid, config);
      const victim = account(store, `${target}@s.whatsapp.net`, config);
      if (victim.wallet < 100) return reply({ text: `😔 +${target} has nothing worth taking in cash.` });

      if (Math.random() < 0.45) {
        const fine = Math.min(thief.wallet, Math.ceil(thief.wallet * 0.2) + 100);
        save(store, senderJid, { ...thief, wallet: thief.wallet - fine });
        return reply({ text: `🚔 *Caught!*\n\nYou tripped the alarm and paid ${fmt(fine, config)} in fines.\n┃ balance : ${fmt(thief.wallet - fine, config)}` });
      }

      const loot = Math.floor(victim.wallet * (0.1 + Math.random() * 0.25));
      save(store, `${target}@s.whatsapp.net`, { ...victim, wallet: victim.wallet - loot });
      save(store, senderJid, { ...thief, wallet: thief.wallet + loot });
      await reply({ text: `🦹 *Successful heist*\n\n┃ stole : ${fmt(loot, config)} from +${target}\n┃ balance : ${fmt(thief.wallet + loot, config)}` });
    },
  },

  {
    name: 'gamble', aliases: ['bet'],
    category: 'economy',
    description: 'Bet an amount on a coin toss (48% win)',
    usage: '.gamble 500',
    cooldownMs: 15_000,
    async run({ store, senderJid, argsText, reply, config }) {
      const a = account(store, senderJid, config);
      const amount = Math.floor(Number(String(argsText).match(/\d+/)?.[0]));
      if (!amount) return reply({ text: 'Usage: .gamble <amount>' });
      if (amount < 10) return reply({ text: '⚠️ Minimum bet is 10.' });
      if (amount > a.wallet) return reply({ text: `❌ Cash: ${fmt(a.wallet, config)}.` });

      const win = Math.random() < 0.48;
      const next = win ? a.wallet + amount : a.wallet - amount;
      save(store, senderJid, { ...a, wallet: next });
      await reply({ text: win
        ? `🎉 *Won* ${fmt(amount, config)}\n┃ balance : ${fmt(next, config)}`
        : `💸 *Lost* ${fmt(amount, config)}\n┃ balance : ${fmt(next, config)}` });
    },
  },

  {
    name: 'slots',
    category: 'economy',
    description: 'Spin the slot machine',
    usage: '.slots 200',
    cooldownMs: 15_000,
    async run({ store, senderJid, argsText, reply, config }) {
      const a = account(store, senderJid, config);
      const bet = Math.floor(Number(String(argsText).match(/\d+/)?.[0])) || 100;
      if (bet > a.wallet) return reply({ text: `❌ Cash: ${fmt(a.wallet, config)}.` });
      if (bet < 10) return reply({ text: '⚠️ Minimum spin is 10.' });

      const symbols = ['🍒', '🍋', '🔔', '💎', '7️⃣'];
      const spin = Array.from({ length: 3 }, () => symbols[Math.floor(Math.random() * symbols.length)]);
      let multiplier = 0;
      if (spin[0] === spin[1] && spin[1] === spin[2]) multiplier = spin[0] === '7️⃣' ? 10 : spin[0] === '💎' ? 6 : 3;
      else if (spin[0] === spin[1] || spin[1] === spin[2] || spin[0] === spin[2]) multiplier = 1.5;

      const delta = multiplier ? Math.round(bet * multiplier) - bet : -bet;
      save(store, senderJid, { ...a, wallet: a.wallet + delta });
      await reply({
        text: [
          '┏❐ 《 ꜱʟᴏᴛꜱ 》 ❐',
          `┃ ${spin.join('  ')}`,
          row('bet', fmt(bet, config)),
          row('result', multiplier ? `×${multiplier} → +${fmt(delta, config)}` : `loss → ${fmt(delta, config)}`),
          row('balance', fmt(a.wallet + delta, config)),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'rich', aliases: ['leaderboard', 'top'],
    category: 'economy',
    description: 'Richest users',
    usage: '.rich',
    async run({ store, reply, config }) {
      const rows = store.entries('user:')
        .map(([k, v]) => ({ jid: k.slice(5), total: (v.wallet || 0) + (v.bank || 0) }))
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      if (!rows.length) return reply({ text: '📭 Nobody has coins yet. Try .daily' });
      const top = rows[0].total || 1;
      await reply({
        text: [
          '┏❐ 《 ʀɪᴄʜᴇꜱᴛ 》 ❐',
          ...rows.map((r, i) => `┣◆ ${String(i + 1).padStart(2)}. +${r.jid.split('@')[0]}\n     ${fmt(r.total, config)} ${bar((r.total / top) * 100, 8)}`),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'ecoreset', aliases: ['reseteco'],
    category: 'economy',
    ownerOnly: true,
    description: 'Wipe one user or everyone (owner)',
    usage: '.ecoreset @user  ·  .ecoreset all',
    async run({ store, argsText, msg, reply }) {
      if (/^all$/i.test(argsText.trim())) {
        const n = store.entries('user:').length;
        for (const [k] of store.entries('user:')) store.delete(k);
        return reply({ text: `🧹 Wiped ${n} account${n === 1 ? '' : 's'}.` });
      }
      const target = targetOf(argsText, msg);
      if (!target) return reply({ text: 'Usage: .ecoreset @user | all' });
      store.delete(`user:${target}@s.whatsapp.net`);
      await reply({ text: `🧹 Reset +${target}'s account.` });
    },
  },
];
