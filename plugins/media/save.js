import { pickMedia, download, isImage, isVideo } from '../../src/lib/media-input.js';
import { bareJid } from '../../src/lib/message.js';

const EXT = {
  imageMessage: 'jpg', videoMessage: 'mp4', audioMessage: 'ogg', documentMessage: 'bin',
  stickerMessage: 'webp',
};

const ALIASES = { saveimg: ['img2doc'], savevideo: ['vid2doc'], saveaudio: ['aud2doc'], savedoc: ['doc2doc'] };

const saver = (name, description, allowed, mime) => ({
  name,
  aliases: ALIASES[name] || [],
  category: 'media',
  description,
  usage: `reply to media with .${name}`,
  async run({ msg, sock, reply }) {
    const picked = pickMedia(msg);
    if (!picked.media || !allowed.includes(picked.type)) {
      return reply({ text: `↩️ Reply to ${description.split(' ')[0]} with .${name}` });
    }
    const buffer = await download(sock, picked.source);
    const ext = EXT[picked.type] || 'bin';
    await reply({
      document: buffer,
      mimetype: picked.media.mimetype || mime,
      fileName: `${name}-${Date.now()}.${ext}`,
      caption: `📥 saved from @${bareJid(msg.key.participant || msg.key.remoteJid)}`,
    });
  },
});

export default [
  saver('saveimg', 'Save an image as a document', ['imageMessage', 'stickerMessage'], 'image/jpeg'),
  saver('savevideo', 'Save a video as a document', ['videoMessage'], 'video/mp4'),
  saver('saveaudio', 'Save an audio clip as a document', ['audioMessage'], 'audio/ogg'),
  saver('savedoc', 'Re-send a replied document', ['documentMessage'], 'application/octet-stream'),
  {
    name: 'save',
    aliases: ['getmedia'],
    category: 'media',
    description: 'Save whatever media you reply to',
    usage: 'reply with .save',
    async run(ctx) {
      const picked = pickMedia(ctx.msg);
      const name = { imageMessage: 'saveimg', videoMessage: 'savevideo', audioMessage: 'saveaudio', documentMessage: 'savedoc' }[picked.type];
      if (!name) return ctx.reply({ text: '↩️ Reply to an image, video, audio or document.' });
      const handler = (await import('./save.js')).default.find((p) => p.name === name);
      return handler.run(ctx);
    },
  },
];
