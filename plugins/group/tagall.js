import { bareJid } from '../../src/lib/message.js';

export default {
  name: 'tagall',
  aliases: ['everyone'],
  category: 'group',
  description: 'Mention every member of the group',
  usage: '.tagall [message]',
  groupOnly: true,
  adminOnly: true,
  async run({ reply, argsText, groupMetadata, config }) {
    const members = groupMetadata?.participants || [];
    if (!members.length) return reply({ text: '❌ Could not read the member list.' });

    const mentions = members.map((p) => p.id);
    const lines = members.map((p, i) => `${i + 1}. @${bareJid(p.id)}${p.admin ? ' 👑' : ''}`);

    await reply({
      text:
        `📣 *${config.botName} — announcement*\n` +
        (argsText ? `\n${argsText}\n` : '') +
        `\n${lines.join('\n')}`,
      mentions,
    });
  },
};
