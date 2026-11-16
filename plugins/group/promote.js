import { bareJid } from '../../src/lib/message.js';
import { invalidateGroup, resolveTarget } from '../../src/lib/group.js';

export default {
  name: 'promote',
  aliases: ['admin'],
  category: 'group',
  description: 'Make someone a group admin',
  usage: '.promote @user | reply',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  async run({ msg, sock, jid, argsText, reply }) {
    const target = resolveTarget(msg, argsText);
    if (!target) return reply({ text: '↩️ Reply to someone or mention them.' });

    await sock.groupParticipantsUpdate(jid, [target], 'promote');
    invalidateGroup(jid);
    await reply({ text: `🛡️ @${bareJid(target)} is now an admin`, mentions: [target] });
  },
};
