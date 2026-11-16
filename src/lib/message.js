import { getContentType } from '@whiskeysockets/baileys';

const WRAPPERS = [
  'ephemeralMessage',
  'viewOnceMessage',
  'viewOnceMessageV2',
  'viewOnceMessageV2Extension',
  'documentWithCaptionMessage',
  'editedMessage',
];

/** Peel off ephemeral / view-once / caption wrappers until we hit real content. */
export function unwrapMessage(message, depth = 0) {
  if (!message || depth > 5) return message;
  const type = getContentType(message);
  if (!type || !WRAPPERS.includes(type)) return message;
  const inner = message[type]?.message ?? message[type];
  return unwrapMessage(inner, depth + 1);
}

/** Best-effort plain text of any message (text, caption, button reply...). */
export function getText(message) {
  const m = unwrapMessage(message);
  if (!m) return '';
  const type = getContentType(m);
  if (!type) return '';
  const c = m[type] || {};
  return c.text || c.caption || m.conversation || '';
}

export const bareJid = (jid = '') => String(jid).split('@')[0].split(':')[0];

export const isGroupJid = (jid = '') => String(jid).endsWith('@g.us');
export const isStatusJid = (jid = '') => String(jid) === 'status@broadcast';
export const isNewsletterJid = (jid = '') => String(jid).endsWith('@newsletter');

export function mentionOf(jid = '') {
  return `@${bareJid(jid)}`;
}
