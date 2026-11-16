import sharp from 'sharp';
import { pickMedia, download } from '../../src/lib/media-input.js';
import { buildStickerExif, stampWebpExif, readStickerExif } from '../../src/lib/webp-exif.js';
import { row } from '../../src/lib/ui.js';

/**
 * Sticker pack metadata. No ffmpeg needed — we rewrite the webp RIFF container
 * directly (see src/lib/webp-exif.js) because sharp 0.33+ can no longer write
 * the raw EXIF payload WhatsApp reads for pack names.
 */

export default [
  {
    name: 'take',
    aliases: ['steal', 'renamesticker'],
    category: 'media',
    description: 'Change a sticker\'s pack name and author',
    usage: '.take <pack> | <author>   (reply to a sticker)',
    cooldownMs: 4000,
    async run({ msg, sock, argsText, reply, config }) {
      const picked = pickMedia(msg);
      if (picked.type !== 'stickerMessage') {
        return reply({ text: '↩️ Reply to a sticker with .take <pack> | <author>' });
      }
      const raw = String(argsText || '').trim();
      const [pack, ...rest] = raw.split('|').map((s) => s.trim());
      const author = rest.join(' | ').trim();
      const buffer = await download(sock, picked.source);
      if (!buffer?.length) return reply({ text: '❌ Could not download that sticker.' });

      const exif = buildStickerExif({
        pack: pack || config.botName,
        author: author || config.ownerName,
      });
      const stamped = stampWebpExif(buffer, exif);
      const meta = await sharp(stamped).metadata();

      await reply({
        sticker: stamped,
        caption: [
          '┏❐ 《 ꜱᴛɪᴄᴋᴇʀ 》 ❐',
          row('pack', pack || config.botName),
          row('author', author || config.ownerName),
          row('size', `${meta.width}×${meta.height} · ${(stamped.length / 1024).toFixed(0)} KB`),
          '┗❐',
        ].join('\n'),
      });
    },
  },

  {
    name: 'stickerinfo',
    aliases: ['sinfo'],
    category: 'media',
    description: 'Read a sticker\'s pack name, author and dimensions',
    usage: 'reply to a sticker with .stickerinfo',
    async run({ msg, sock, reply }) {
      const picked = pickMedia(msg);
      if (picked.type !== 'stickerMessage') return reply({ text: '↩️ Reply to a sticker.' });
      const buffer = await download(sock, picked.source);
      if (!buffer?.length) return reply({ text: '❌ Could not download that sticker.' });

      const meta = await sharp(buffer).metadata();
      const exif = readStickerExif(buffer);
      await reply({
        text: [
          '┏❐ 《 ꜱᴛɪᴄᴋᴇʀ ɪɴꜰᴏ 》 ❐',
          row('pack', exif?.['sticker-pack-name'] || '— (none)'),
          row('author', exif?.['sticker-pack-publisher'] || '— (none)'),
          row('emojis', (exif?.emojis || []).join(' ') || '—'),
          row('dims', `${meta.width}×${meta.height}`),
          row('size', `${(buffer.length / 1024).toFixed(0)} KB · ${meta.format}`),
          row('alpha', meta.hasAlpha ? 'yes' : 'no'),
          '┗❐',
        ].join('\n'),
      });
    },
  },
];
