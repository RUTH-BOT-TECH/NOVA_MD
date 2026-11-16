import { reactionGif } from '../../src/lib/anime.js';
import { bareJid } from '../../src/lib/message.js';
import { resolveTarget } from '../../src/lib/group.js';

/**
 * SFW anime reaction gifs. Providers: otakugifs (primary), purrbot (fallback).
 * Sent as `video` with gifPlayback so WhatsApp loops them like a gif.
 */

const ACTIONS = {
  kiss: 'kisses',
  hug: 'hugs',
  pat: 'pats',
  slap: 'slaps',
  cuddle: 'cuddles',
  wave: 'waves at',
  poke: 'pokes',
  blush: 'blushes at',
};

export default Object.entries(ACTIONS).map(([action, verb]) => ({
  name: action,
  category: 'anime',
  description: `Anime reaction gif — ${verb}`,
  usage: `.${action} [@user]`,
  cooldownMs: 2500,
  async run({ msg, argsText, reply, pushName }) {
    const target = resolveTarget(msg, argsText);
    try {
      const media = await reactionGif(action);
      const who = pushName || 'someone';
      const caption = target
        ? `*${who}* ${verb} @${bareJid(target)}\n_${media.provider}_`
        : `*${who}* ${verb}\n_${media.provider}_`;
      const payload = { video: { url: media.url }, gifPlayback: true, mimetype: 'video/mp4', caption };
      if (target) payload.mentions = [target];
      await reply(payload);
    } catch (err) {
      await reply({ text: `❌ ${err.message.slice(0, 160)}` });
    }
  },
}));
