import { download } from '../../src/lib/media-input.js';
import { stickerToImage } from '../../src/lib/media.js';

export default {
  name: 'toimg',
  aliases: ['toimage', 'unsticker'],
  category: 'tools',
  description: 'Turn a sticker back into a normal image',
  usage: 'reply to a sticker with .toimg',
  async run({ msg, sock, reply }) {
    const info = msg.message?.extendedTextMessage?.contextInfo;
    const quoted = info?.quotedMessage;
    const sticker = quoted?.stickerMessage || msg.message?.stickerMessage;
    if (!sticker) return reply({ text: '↩️ Reply to a sticker with .toimg' });

    const source = quoted
      ? { key: { remoteJid: msg.key.remoteJid, id: info.stanzaId, participant: info.participant, fromMe: false }, message: quoted }
      : { key: msg.key, message: msg.message };

    const buffer = await download(sock, source);
    const png = await stickerToImage(buffer);
    await reply({ image: png, caption: '🖼️ converted from sticker' });
  },
};
