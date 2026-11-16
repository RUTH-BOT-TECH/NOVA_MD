import { bareJid } from '../../src/lib/message.js';
import { adminsOf } from '../../src/lib/group.js';

export default {
  name: 'admins',
  aliases: ['adminlist'],
  category: 'group',
  description: 'List the group admins',
  usage: '.admins',
  groupOnly: true,
  async run({ reply, groupMetadata }) {
    const admins = adminsOf(groupMetadata);
    if (!admins.length) return reply({ text: 'This group has no admins.' });
    const lines = admins.map((jid, i) => `${i + 1}. @${jid}`);
    await reply({
      text: `🛡️ *Admins (${admins.length})*\n\n${lines.join('\n')}`,
      mentions: admins.map((a) => `${a}@s.whatsapp.net`),
    });
  },
};
