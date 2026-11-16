export default {
  name: 'link',
  aliases: ['invite', 'gclink'],
  category: 'group',
  description: 'Get or reset the group invite link',
  usage: '.link | .link revoke',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,
  async run({ args, sock, jid, reply }) {
    const revoke = (args[0] || '').toLowerCase() === 'revoke';
    const code = revoke ? await sock.groupRevokeInvite(jid) : await sock.groupInviteCode(jid);
    await reply({
      text: `${revoke ? '♻️ New link' : '🔗 Invite link'}:\nhttps://chat.whatsapp.com/${code}`,
    });
  },
};
