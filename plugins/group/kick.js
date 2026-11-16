import { bareJid } from '../../src/lib/message.js';
import { resolveTarget } from '../../src/lib/group.js';

export default {
  name: 'kick',
  aliases: ['remove', 'boot'],
  category: 'group',
  description: 'Remove a member (reply to them or pass @mention / number)',
  usage: '.kick @user | reply',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  async run({ msg, sock, jid, argsText, reply }) {
    const target = resolveTarget(msg, argsText);
    if (!target) return reply({ text: '↩️ Reply to someone, mention them, or pass their number.' });

    await sock.groupParticipantsUpdate(jid, [target], 'remove');
    await reply({ text: `👋 Removed @${bareJid(target)}`, mentions: [target] });
  },
};
