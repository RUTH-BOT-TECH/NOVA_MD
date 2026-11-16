import { bareJid } from '../../src/lib/message.js';
import { invalidateGroup, resolveTarget } from '../../src/lib/group.js';

export default {
  name: 'demote',
  aliases: ['unadmin'],
  category: 'group',
  description: 'Take admin rights away from someone',
  usage: '.demote @user | reply',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  async run({ msg, sock, jid, argsText, reply }) {
    const target = resolveTarget(msg, argsText);
    if (!target) return reply({ text: '↩️ Reply to someone or mention them.' });

    await sock.groupParticipantsUpdate(jid, [target], 'demote');
    invalidateGroup(jid);
    await reply({ text: `⬇️ @${bareJid(target)} is no longer an admin`, mentions: [target] });
  },
};
