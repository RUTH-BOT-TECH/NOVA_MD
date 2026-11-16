import { downloadMediaMessage, getContentType } from '@whiskeysockets/baileys';

/**
 * Find the media a command should act on: the quoted message if there is one,
 * otherwise the message itself. Returns a ready-to-download WAMessage plus type.
 */
export function pickMedia(msg) {
  const info = msg.message?.extendedTextMessage?.contextInfo
    || msg.message?.imageMessage?.contextInfo
    || msg.message?.videoMessage?.contextInfo
    || {};
  const quoted = info.quotedMessage;

  const source = quoted
    ? { key: { remoteJid: msg.key.remoteJid, id: info.stanzaId, participant: info.participant, fromMe: false }, message: quoted }
    : { key: msg.key, message: msg.message };

  const type = getContentType(source.message || {});
  return { source, type, media: type ? source.message[type] : null, quoted: !!quoted };
}

export const isImage = (type) => type === 'imageMessage';
export const isVideo = (type) => type === 'videoMessage';
export const isSticker = (type) => type === 'stickerMessage';

/**
 * Download a media message. Prefers the socket's own method when present —
 * that is what Baileys exposes anyway — and falls back to the standalone util.
 * Keeping this behind the socket also makes the whole pipeline testable.
 */
export async function download(sock, source) {
  if (typeof sock?.downloadMediaMessage === 'function') {
    return sock.downloadMediaMessage(source, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage });
  }
  return downloadMediaMessage(source, 'buffer', {}, { reuploadRequest: sock?.updateMediaMessage });
}

/** Convenience: the first image the message references, or null. */
export async function grabImage(sock, msg) {
  const picked = pickMedia(msg);
  if (!isImage(picked.type)) return null;
  return download(sock, picked.source);
}
