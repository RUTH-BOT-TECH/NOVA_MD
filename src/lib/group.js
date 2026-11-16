import { bareJid } from './message.js';

const cache = new Map(); // jid -> { metadata, at }
const TTL = 60_000;

export async function getGroupMetadata(sock, jid, { fresh = false } = {}) {
  const hit = cache.get(jid);
  if (!fresh && hit && Date.now() - hit.at < TTL) return hit.metadata;
  const metadata = await sock.groupMetadata(jid);
  cache.set(jid, { metadata, at: Date.now() });
  return metadata;
}

export function invalidateGroup(jid) {
  cache.delete(jid);
}

export const adminsOf = (metadata) =>
  (metadata?.participants || [])
    .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
    .map((p) => bareJid(p.id));

export const isParticipantAdmin = (metadata, jid) => adminsOf(metadata).includes(bareJid(jid));

export const isBotAdmin = (sock, metadata) => isParticipantAdmin(metadata, sock.user?.id);

export function findParticipant(metadata, jid) {
  const phone = bareJid(jid);
  return (metadata?.participants || []).find((p) => bareJid(p.id) === phone);
}

/**
 * One place to resolve "who is this command aimed at":
 * @mention → quoted message author → bare number in the args.
 */
export function resolveTarget(msg, argsText = '') {
  const info =
    msg?.message?.extendedTextMessage?.contextInfo ||
    msg?.message?.imageMessage?.contextInfo ||
    msg?.message?.videoMessage?.contextInfo ||
    {};

  const mentioned = info.mentionedJid?.[0];
  if (mentioned) return mentioned;
  if (info.participant) return info.participant;

  const num = String(argsText).match(/(?:\+)?(\d{7,15})/);
  if (num) return `${num[1]}@s.whatsapp.net`;
  return null;
}
