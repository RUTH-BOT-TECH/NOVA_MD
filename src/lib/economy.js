import { bareJid } from './message.js';

/** Shared economy helpers so games, shops and jobs all use one wallet. */

export const ecoKey = (jid) => `user:${bareJid(jid)}`;

export const fmt = (n, config) => `${config.economy.symbol}${Math.round(n).toLocaleString()}`;

export function account(store, jid, config) {
  const existing = store.get(ecoKey(jid));
  if (existing && typeof existing.wallet === 'number') return existing;
  const fresh = {
    wallet: config.economy.startBalance, bank: 0, streak: 0, lastDaily: 0,
    lastWork: 0, lastBeg: 0, created: Date.now(), items: {}, xp: 0,
  };
  store.set(ecoKey(jid), fresh);
  return fresh;
}

export const save = (store, jid, patch) => store.set(ecoKey(jid), patch);

export const credit = (store, jid, config, amount) => {
  const a = account(store, jid, config);
  save(store, jid, { ...a, wallet: a.wallet + amount });
  return a.wallet + amount;
};

export const debit = (store, jid, config, amount) => {
  const a = account(store, jid, config);
  if (a.wallet < amount) return null;
  save(store, jid, { ...a, wallet: a.wallet - amount });
  return a.wallet - amount;
};

/** Resolve a target from reply → mention → leading number. */
export function targetOf(argsText = '', msg = {}) {
  const info = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo;
  const jid = info?.mentionedJid?.[0] || (info?.participant && info?.quotedMessage ? info.participant : null);
  if (jid) return bareJid(jid);
  const digits = String(argsText).match(/\d{7,15}/)?.[0];
  return digits || null;
}
