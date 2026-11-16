import { getContentType } from '@whiskeysockets/baileys';
import { download } from '../../src/lib/media-input.js';

export default {
  name: 'vv',
  aliases: ['viewonce', 'reveal'],
  category: 'tools',
  description: 'Re-send a view-once photo/video/voice note as normal media',
  usage: 'reply to a view-once message with .vv',
  async run({ msg, reply, sock }) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return reply({ text: '↩️ Reply to a view-once message with .vv' });

    const inner = quoted.viewOnceMessage?.message
      || quoted.viewOnceMessageV2?.message
      || quoted.viewOnceMessageV2Extension?.message
      || quoted;

    const type = getContentType(inner);
    const media = inner?.[type];
    if (!media) return reply({ text: '❌ That message has no media in it.' });

    const buffer = await download(sock, { key: msg.key, message: inner, messageTimestamp: msg.messageTimestamp });

    const out = { caption: `🔓 opened by ${'@' + (msg.key.participant || msg.key.remoteJid).split('@')[0]}` };
    if (type === 'imageMessage') { out.image = buffer; }
    else if (type === 'videoMessage') { out.video = buffer; }
    else if (type === 'audioMessage') { out.audio = buffer; out.mimetype = 'audio/ogg'; }
    else return reply({ text: '❌ Unsupported media type.' });

    await reply(out);
  },
};
