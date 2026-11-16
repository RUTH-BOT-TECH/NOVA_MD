import { row } from '../../src/lib/ui.js';
import { bareJid } from '../../src/lib/message.js';

export default {
  name: 'whoami',
  aliases: ['myid', 'id'],
  category: 'tools',
  description: 'Your JID, chat id, role and device info',
  usage: '.whoami',
  async run({ reply, senderJid, jid, isGroup, isOwner, isAdmin, pushName, msg, sock }) {
    await reply({
      text: [
        '┏❐ 《 ᴡʜᴏᴀᴍɪ 》 ❐',
        row('push name', pushName || '—'),
        row('number', bareJid(senderJid)),
        row('jid', senderJid),
        row('chat', jid),
        row('type', isGroup ? 'group' : 'direct'),
        row('role', isOwner ? 'owner' : isAdmin ? 'admin' : 'member'),
        row('device', msg.key?.id ? String(msg.key.id).slice(0, 8) : '—'),
        row('bot', sock.user?.id || 'not linked'),
        '┗❐',
      ].join('\n'),
    });
  },
};
