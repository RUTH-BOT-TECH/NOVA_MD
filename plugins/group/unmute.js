export default {
  name: 'unmute',
  aliases: ['open', 'unlock'],
  category: 'group',
  description: 'Everyone can talk again',
  usage: '.unmute',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  async run({ sock, jid, reply }) {
    await sock.groupSettingUpdate(jid, 'not_announcement');
    await reply({ text: '🔊 Group open — everyone can send messages.' });
  },
};
