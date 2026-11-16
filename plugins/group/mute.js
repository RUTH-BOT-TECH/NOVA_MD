export default {
  name: 'mute',
  aliases: ['close', 'lock'],
  category: 'group',
  description: 'Admins-only mode: only admins can talk',
  usage: '.mute',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  async run({ sock, jid, reply }) {
    await sock.groupSettingUpdate(jid, 'announcement');
    await reply({ text: '🔇 Group closed — admins only can send messages.' });
  },
};
