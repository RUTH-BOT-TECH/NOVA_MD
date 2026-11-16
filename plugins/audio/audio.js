import { BUILDS, convertBuffer, requireFfmpeg, inputExt, FfmpegError } from '../../src/lib/ffmpeg.js';
import { pickMedia, download } from '../../src/lib/media-input.js';
import { formatBytes } from '../../src/lib/ytdlp.js';

/**
 * Audio/video conversions. Every one needs ffmpeg; when it is missing the user
 * gets install instructions instead of a dead command. Argument building lives
 * in src/lib/ffmpeg.js and is unit-tested without the binary.
 */

const MIME = { mp3: 'audio/mpeg', ogg: 'audio/ogg; codecs=opus', m4a: 'audio/mp4', png: 'image/png', gif: 'image/gif' };

async function grab(ctx) {
  const picked = pickMedia(ctx.msg);
  if (!picked.media) return { error: '↩️ Reply to an audio clip, video or voice note.' };
  const buffer = await download(ctx.sock, picked.source);
  if (!buffer?.length) return { error: '❌ Could not download that media.' };
  if (buffer.length > 64 * 1024 * 1024) return { error: '⚠️ File is too large to process (64 MB max).' };
  return { buffer, type: picked.type };
}

const op = ({ name, aliases = [], build, description, usage, deliver = 'audio', cooldownMs = 8000 }) => ({
  name,
  aliases,
  category: 'audio',
  description,
  usage,
  cooldownMs,
  async run(ctx) {
    try {
      await requireFfmpeg();                       // fail fast with the install hint
      const got = await grab(ctx);
      if (got.error) return ctx.reply({ text: got.error });

      const { args, out } = build(ctx.args || []);
      const converted = await convertBuffer(got.buffer, { args, out });
      const caption = `✅ ${name} · ${formatBytes(converted.length)} (was ${formatBytes(got.buffer.length)})`;

      if (deliver === 'audio') {
        return ctx.reply({ audio: converted, mimetype: MIME[out] || 'audio/mpeg', ptt: out === 'ogg' });
      }
      if (deliver === 'image') return ctx.reply({ image: converted, caption });
      if (deliver === 'video') return ctx.reply({ video: converted, mimetype: 'video/mp4', caption, gifPlayback: out === 'gif' });
    } catch (err) {
      const text = err instanceof FfmpegError ? `⚙️ ${err.message}` : `❌ ${err.message.slice(0, 300)}`;
      await ctx.reply({ text });
    }
  },
});

export default [
  op({ name: 'tomp3', aliases: ['mp3'], build: BUILDS.tomp3, description: 'Convert audio/video to mp3', usage: 'reply with .tomp3' }),
  op({ name: 'tovoice', aliases: ['toptt', 'voicenote'], build: BUILDS.tovoice, description: 'Convert to a WhatsApp voice note (ogg/opus)', usage: 'reply with .tovoice' }),
  op({ name: 'toaudio', aliases: ['extractaudio'], build: BUILDS.toaudio, description: 'Extract audio from a video', usage: 'reply to a video with .toaudio' }),
  op({ name: 'reverseaudio', aliases: ['revaudio'], build: BUILDS.reverse, description: 'Play audio backwards', usage: 'reply with .reverseaudio' }),
  op({ name: 'volume', build: BUILDS.volume, description: 'Change loudness — .volume 2 (×N)', usage: 'reply with .volume 1.5' }),
  op({ name: 'audiospeed', aliases: ['tempo'], build: BUILDS.speed, description: 'Change audio speed without pitch — .audiospeed 1.5', usage: 'reply with .audiospeed 2' }),
  op({ name: 'trim', aliases: ['cut'], build: BUILDS.trim, description: 'Cut a clip — .trim 0:30 1:00', usage: 'reply with .trim <start> <end>' }),
  op({ name: 'waveform', aliases: ['wavepic'], build: BUILDS.waveform, description: 'Render an audio waveform image', usage: 'reply to audio with .waveform', deliver: 'image' }),
  op({ name: 'togif', build: BUILDS.gif, description: 'Convert a short video to a GIF', usage: 'reply to a video with .togif', deliver: 'video' }),

  {
    name: 'audiostatus',
    aliases: ['ffstatus', 'ffmpeg'],
    category: 'audio',
    description: 'Whether this host can convert audio',
    usage: '.audiostatus',
    async run({ reply }) {
      const { hasFfmpeg, installHint } = await import('../../src/lib/ffmpeg.js');
      const ok = await hasFfmpeg();
      await reply({
        text: ok
          ? '┏❐ 《 ꜰꜰᴍᴘᴇɢ 》 ❐\n┃ ꜱᴛᴀᴛᴜꜱ : ready\n┃ ᴏᴘꜱ : 9 available\n┗❐'
          : `┏❐ 《 ꜰꜰᴍᴘᴇɢ 》 ❐\n┃ ꜱᴛᴀᴛᴜꜱ : missing\n┗❐\n\n${installHint}`,
      });
    },
  },
];
