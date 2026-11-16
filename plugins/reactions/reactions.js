import { bareJid } from '../../src/lib/message.js';

/**
 * Emoji reactions. These work on the message you reply to — that is the
 * target WhatsApp shows the reaction on, so we build a key from the quote.
 */

/** Quoted message key, or the command message if nothing was replied to. */
function reactTarget(ctx) {
  const info = ctx.message?.extendedTextMessage?.contextInfo;
  if (info?.stanzaId) {
    return {
      remoteJid: ctx.jid,
      id: info.stanzaId,
      participant: info.participant || undefined,
      fromMe: false,
    };
  }
  return ctx.key;
}

const reaction = (name, emoji, aliases = []) => ({
  name,
  aliases,
  category: 'reactions',
  description: `React with ${emoji}${aliases.length ? `  (aka ${aliases.map((a) => `.${a}`).join(' ')})` : ''}`,
  usage: `.${name} (reply to a message)`,
  cooldownMs: 800,
  async run(ctx) {
    try {
      await ctx.sock.sendMessage(ctx.jid, { react: { text: emoji, key: reactTarget(ctx) } });
      if (!ctx.message?.extendedTextMessage?.contextInfo?.stanzaId) {
        await ctx.reply({ text: `_Reacted ${emoji} — reply to a message next time to react to theirs._` });
      }
    } catch (err) {
      await ctx.reply({ text: `❌ Could not react: ${err.message.slice(0, 120)}` });
    }
  },
});

export default [
  reaction('laugh', '😂', ['lol', 'lmao']),
  reaction('love', '❤️', ['heart']),
  reaction('fire', '🔥', ['lit']),
  reaction('wow', '😮', ['shock']),
  reaction('sad', '😢', ['cry']),
  reaction('angry', '😠', ['mad']),
  reaction('clap', '👏', ['bravo']),
  reaction('salute', '🫡', ['respect']),
  reaction('think', '🤔', ['hmm']),
  reaction('ok', '👌', ['okay']),
  reaction('nope', '👎', ['dislike']),
  reaction('skull', '💀', ['dead']),
  reaction('party', '🥳', ['celebrate']),
  reaction('hundred', '💯', ['perfect']),
  reaction('eyes', '👀', ['look']),
  reaction('pray', '🙏', ['thanks']),

  {
    name: 'react',
    category: 'reactions',
    description: 'React with any emoji you type',
    usage: '.react 🔥 (reply to a message)',
    cooldownMs: 800,
    async run(ctx) {
      const emoji = String(ctx.argsText || '').trim().split(/\s+/)[0];
      if (!emoji) return ctx.reply({ text: 'Usage: .react <emoji> (reply to a message)' });
      await ctx.sock.sendMessage(ctx.jid, { react: { text: emoji, key: reactTarget(ctx) } });
    },
  },

  {
    name: 'unreact', aliases: ['noreact'],
    category: 'reactions',
    description: 'Remove your reaction',
    usage: '.unreact (reply to the message)',
    cooldownMs: 800,
    async run(ctx) {
      await ctx.sock.sendMessage(ctx.jid, { react: { text: '', key: reactTarget(ctx) } });
    },
  },
];
