export default {
  name: 'broadcast',
  aliases: ['bc'],
  category: 'owner',
  description: 'Send a message to every group the bot is in',
  usage: '.broadcast <message>',
  ownerOnly: true,
  async run({ sock, argsText, reply, config }) {
    if (!argsText) return reply({ text: 'Usage: .broadcast <message>' });

    const chats = await sock.groupFetchAllParticipating();
    const ids = Object.keys(chats || {});
    await reply({ text: `📤 Broadcasting to ${ids.length} groups…` });

    let ok = 0;
    for (const id of ids) {
      try {
        await sock.sendMessage(id, { text: `📢 *${config.botName} update*\n\n${argsText}` });
        ok++;
      } catch { /* skip dead groups */ }
    }
    await reply({ text: `✅ Delivered to ${ok}/${ids.length} groups.` });
  },
};
