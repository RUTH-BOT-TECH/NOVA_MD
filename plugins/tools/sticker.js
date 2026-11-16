import { download } from '../../src/lib/media-input.js';
import { imageToSticker } from '../../src/lib/media.js';

export default {
  name: 'sticker',
  aliases: ['s', 'stiker'],
  category: 'tools',
  description: 'Reply to an image to turn it into a sticker',
  usage: 'reply to an image with .sticker',
  cooldownMs: 3000,
  async run({ msg, sock, reply }) {
    const info = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = info?.quotedMessage;

    const source = quoted
      ? { key: { remoteJid: msg.key.remoteJid, id: info.stanzaId, participant: info.participant, fromMe: false }, message: quoted }
      : { key: msg.key, message: msg.message };

    const content = source.message?.imageMessage
      ? source.message.imageMessage
      : source.message?.documentWithCaptionMessage?.message?.imageMessage;

    if (!content) {
      const isVideo = !!(source.message?.videoMessage || quoted?.videoMessage);
      return reply({
        text: isVideo
          ? '🎬 Video stickers need ffmpeg — install it and wire the conversion in src/lib/media.js.\nImages work today.'
          : '↩️ Reply to a photo with .sticker',
      });
    }

    const buffer = await download(sock, source);
    const webp = await imageToSticker(buffer);
    await reply({ sticker: webp });
  },
};
