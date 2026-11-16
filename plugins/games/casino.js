import crypto from 'node:crypto';
import { account, save, fmt } from '../../src/lib/economy.js';
import { row } from '../../src/lib/ui.js';

/**
 * Casino games. `.blackjack` is a real state machine (hit/stand across
 * messages); the rest are single-shot. All of them settle against the shared
 * wallet, so a win is the same money `.balance` shows.
 */

const draw = () => {
  const n = crypto.randomInt(1, 14);          // 1 = ace, 11-13 = face
  return { rank: n, value: Math.min(n, 10) || 10, label: ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[n] || String(n) };
};
const handValue = (hand) => {
  let total = hand.reduce((sum, c) => sum + (c.rank === 1 ? 11 : c.value), 0);
  for (const c of hand) if (c.rank === 1 && total > 21) total -= 10;
  return total;
};
const show = (hand) => hand.map((c) => c.label).join(' ');

const BJ = (jid) => `game:blackjack:${jid}`;
/** store.get() returns {} for unknown keys — presence needs store.has(). */
const hand = (store, jid) => (store.has(BJ(jid)) ? store.get(BJ(jid)) : null);

export default [
  {
    name: 'blackjack',
    aliases: ['bj', '21'],
    category: 'games',
    description: 'Play a hand of blackjack against the dealer',
    usage: '.blackjack 200  →  .hit / .stand',
    cooldownMs: 3000,
    async run({ senderJid, store, argsText, reply, config }) {
      const existing = hand(store, senderJid);
      if (existing) return reply({ text: '🃏 You already have a hand open — *.hit* or *.stand*.' });

      const wager = Math.floor(Number(String(argsText).match(/\d+/)?.[0]));
      if (!wager) return reply({ text: 'Usage: .blackjack <wager>  e.g. .blackjack 200' });
      const acc = account(store, senderJid, config);
      if (wager < 10) return reply({ text: '⚠️ Minimum wager is 10.' });
      if (acc.wallet < wager) return reply({ text: `❌ Cash: ${fmt(acc.wallet, config)} — you need ${fmt(wager, config)}.` });

      const player = [draw(), draw()];
      const dealer = [draw(), draw()];
      save(store, senderJid, { ...acc, wallet: acc.wallet - wager });
      store.set(BJ(senderJid), { player, dealer, wager });

      const pv = handValue(player);
      if (pv === 21) {
        store.delete(BJ(senderJid));
        const acc2 = account(store, senderJid, config);
        const win = Math.round(wager * 1.5);
        save(store, senderJid, { ...acc2, wallet: acc2.wallet + wager + win });
        return reply({ text: `🂡 *Blackjack!* ${show(player)}\n\n┃ won : +${fmt(win, config)}\n┃ balance : ${fmt(acc2.wallet + wager + win, config)}` });
      }

      await reply({
        text: [
          '┏❐ 《 ʙʟᴀᴄᴋᴊᴀᴄᴋ 》 ❐',
          row('you', `${show(player)} (${pv})`),
          row('dealer', `${dealer[0].label} ?`),
          row('wager', fmt(wager, config)),
          '┗❐',
          '_hit or stand?_',
        ].join('\n'),
      });
    },
  },

  {
    name: 'hit',
    aliases: ['hitme'],
    category: 'games',
    description: 'Take another card',
    usage: '.hit',
    async run({ senderJid, store, reply, config }) {
      const game = hand(store, senderJid);
      if (!game) return reply({ text: 'No open hand. Start with .blackjack <wager>' });

      game.player.push(draw());
      const pv = handValue(game.player);
      if (pv > 21) {
        store.delete(BJ(senderJid));
        return reply({ text: `💥 *Bust* — ${show(game.player)} (${pv}).\n┃ lost : ${fmt(game.wager, config)}` });
      }
      store.set(BJ(senderJid), game);
      await reply({ text: `🃏 ${show(game.player)} (${pv})\n_hit or stand?_` });
    },
  },

  {
    name: 'stand',
    category: 'games',
    description: 'Hold your hand and let the dealer play',
    usage: '.stand',
    async run({ senderJid, store, reply, config }) {
      const game = hand(store, senderJid);
      if (!game) return reply({ text: 'No open hand. Start with .blackjack <wager>' });

      while (handValue(game.dealer) < 17) game.dealer.push(draw());
      const pv = handValue(game.player);
      const dv = handValue(game.dealer);
      store.delete(BJ(senderJid));

      const acc = account(store, senderJid, config);
      const bust = dv > 21;
      const win = pv > dv || bust;
      const push = pv === dv && !bust;
      const payout = push ? game.wager : win ? game.wager * 2 : 0;
      save(store, senderJid, { ...acc, wallet: acc.wallet + payout });

      await reply({
        text: [
          '┏❐ 《 ʀᴇꜱᴜʟᴛ 》 ❐',
          row('you', `${show(game.player)} (${pv})`),
          row('dealer', `${show(game.dealer)} (${dv})`),
          row('outcome', push ? 'push — stake returned' : win ? 'you win' : 'dealer wins'),
          row('balance', fmt(acc.wallet + payout, config)),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'roulette',
    category: 'games',
    description: 'Bet red, black or a number',
    usage: '.roulette 100 red|black|0-36',
    cooldownMs: 5000,
    async run({ senderJid, store, argsText, reply, config }) {
      const [rawBet, pick] = String(argsText).trim().split(/\s+/);
      const wager = Math.floor(Number(rawBet));
      const choice = (pick || '').toLowerCase();
      if (!wager || !choice) return reply({ text: 'Usage: .roulette <wager> red|black|0-36' });
      const isNumber = /^\d{1,2}$/.test(choice) && Number(choice) <= 36;
      if (!isNumber && !['red', 'black', 'green'].includes(choice)) {
        return reply({ text: '⚠️ Bet on *red*, *black* or a number 0–36.' });
      }
      const acc = account(store, senderJid, config);
      if (acc.wallet < wager) return reply({ text: `❌ Cash: ${fmt(acc.wallet, config)}.` });

      const spin = crypto.randomInt(0, 37);
      const colour = spin === 0 ? 'green' : spin % 2 ? 'red' : 'black';
      const won = choice === colour || (isNumber && Number(choice) === spin);
      const multiplier = isNumber ? 35 : 2;
      const delta = won ? wager * (multiplier - 1) : -wager;
      save(store, senderJid, { ...acc, wallet: acc.wallet + delta });

      await reply({
        text: [
          '┏❐ 《 ʀᴏᴜʟᴇᴛᴛᴇ 》 ❐',
          row('spin', `${spin} ${colour === 'red' ? '🔴' : colour === 'black' ? '⚫' : '🟢'}`),
          row('your bet', `${choice} · ${fmt(wager, config)}`),
          row('result', won ? `won +${fmt(delta, config)}` : `lost ${fmt(Math.abs(delta), config)}`),
          row('balance', fmt(acc.wallet + delta, config)),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'wheel',
    aliases: ['spinwheel'],
    category: 'games',
    description: 'Spin a prize wheel',
    usage: '.wheel',
    cooldownMs: 10_000,
    async run({ senderJid, store, reply, config }) {
      const slices = [0, 0, 50, 100, 100, 250, 500, 1000];
      const hitIndex = crypto.randomInt(slices.length);
      const prize = slices[hitIndex];
      const acc = account(store, senderJid, config);
      save(store, senderJid, { ...acc, wallet: acc.wallet + prize });
      await reply({
        text: [
          '┏❐ 《 ᴡʜᴇᴇʟ 》 ❐',
          `┃ ${slices.map((s, i) => (i === hitIndex ? `*${s}*` : s)).join(' · ')}`,
          row('prize', prize ? `+${fmt(prize, config)}` : 'nothing this time'),
          row('balance', fmt(acc.wallet + prize, config)),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'lottery',
    aliases: ['lotto'],
    category: 'games',
    description: 'Pick 5 numbers from 1–50',
    usage: '.lottery  ·  .lottery 3 11 22 37 49',
    cooldownMs: 60_000,
    async run({ senderJid, store, argsText, reply, config }) {
      const picks = String(argsText).match(/\d{1,2}/g)?.map(Number).slice(0, 5) ?? [];
      const pool = Array.from({ length: 50 }, (_, i) => i + 1);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = crypto.randomInt(i + 1);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const winning = pool.slice(0, 5).sort((a, b) => a - b);
      const matched = picks.filter((n) => winning.includes(n)).length;
      const prize = { 0: 0, 1: 100, 2: 500, 3: 5000, 4: 50_000, 5: 500_000 }[matched] ?? 0;

      const acc = account(store, senderJid, config);
      save(store, senderJid, { ...acc, wallet: acc.wallet + prize });
      await reply({
        text: [
          '┏❐ 《 ʟᴏᴛᴛᴇʀʏ 》 ❐',
          row('draw', winning.join(' · ')),
          row('yours', picks.length ? picks.sort((a, b) => a - b).join(' · ') : '— (no ticket)'),
          row('matches', String(matched)),
          row('prize', prize ? `+${fmt(prize, config)}` : 'nothing'),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'roll',
    aliases: ['roll20', 'dice20'],
    category: 'games',
    description: 'Roll dice — .roll 2d6 or .roll 20',
    usage: '.roll 20  ·  .roll 2d6',
    async run({ argsText, reply }) {
      const raw = String(argsText || '6').trim().toLowerCase();
      const m = raw.match(/^(\d{1,2})d(\d{1,4})$/);
      const count = m ? Math.min(20, Number(m[1])) : 1;
      const sides = m ? Math.min(1000, Number(m[2])) : Math.min(1000, Number(raw) || 6);
      const rolls = Array.from({ length: count }, () => crypto.randomInt(1, sides + 1));
      const total = rolls.reduce((a, b) => a + b, 0);
      await reply({
        text: count === 1
          ? `🎲 *${total}* (d${sides})`
          : `🎲 ${rolls.join(' + ')} = *${total}*  (${count}d${sides})`,
      });
    },
  },

  {
    name: 'lovecalc',
    aliases: ['love', 'match'],
    category: 'games',
    description: 'Deterministic love score between two names',
    usage: '.lovecalc Ada | Chidi',
    async run({ argsText, reply, msg }) {
      const info = msg.message?.extendedTextMessage?.contextInfo;
      const mentioned = info?.mentionedJid?.[0];
      const parts = String(argsText).split('|').map((s) => s.trim()).filter(Boolean);
      const a = parts[0] || (info?.participant ? `+${info.participant.split('@')[0]}` : '');
      const b = parts[1] || (mentioned ? `+${mentioned.split('@')[0]}` : '');
      if (!a || !b) return reply({ text: 'Usage: .lovecalc name | name   (or reply to someone with .lovecalc name)' });

      // deterministic: same pair always scores the same
      const seed = [a, b].map((s) => s.toLowerCase()).sort().join('&');
      let h = 7;
      for (const ch of seed) h = (h * 31 + ch.codePointAt(0)) % 1000003;
      const score = h % 101;
      const verdict = score < 20 ? 'not really' : score < 40 ? 'there is something' : score < 60 ? 'worth a try' : score < 80 ? 'strong match' : 'made for each other';
      const bar = '█'.repeat(Math.round(score / 10)).padEnd(10, '░');
      await reply({ text: `💘 *${a}*  ×  *${b}*\n\n┃ ${bar} *${score}%*\n┃ _${verdict}_\n\n_deterministic — same two names always score the same_` });
    },
  },
];
