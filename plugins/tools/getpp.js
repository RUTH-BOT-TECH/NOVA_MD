import { resolveTarget } from '../../src/lib/group.js';
import { bareJid } from '../../src/lib/message.js';

export default {
  name: 'getpp',
  aliases: ['pfp', 'avatar'],
  category: 'tools',
  description: 'Get a profile picture by reply, mention or number',
  usage: '.getpp @user | .getpp 2348012345678',
  async run({ msg, sock, reply, argsText, senderJid }) {
    const target = resolveTarget(msg, argsText) || senderJid;
    let url = null;
    try { url = await sock.profilePictureUrl(target, 'image'); } catch { /* hidden or none */ }
    if (!url) {
      return reply({ text: `🔒 No public profile picture for @${bareJid(target)} (or they hide it).`, mentions: [target] });
    }
    await reply({ image: { url }, caption: `🖼️ @${bareJid(target)}`, mentions: [target] });
  },
};
