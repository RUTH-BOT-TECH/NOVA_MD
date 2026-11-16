import { contactMessage, contactsMessage, looksLikeNumber } from '../../src/lib/vcard.js';
import { bareJid } from '../../src/lib/message.js';

export default {
  name: 'vcard',
  aliases: ['contact', 'savecontact'],
  category: 'tools',
  description: 'Send a contact card — yours, or anyone\'s by number',
  usage: '.vcard | .vcard 2348012345678 Name',
  async run({ args, reply, config, sock, senderJid }) {
    const tick = config.nameTick || '';

    // no args → the bot's own card (this is the one that looks "verified")
    if (!args.length) {
      const phone = bareJid(sock.user?.id || config.ownerNumber);
      return reply(contactMessage({
        name: `${config.botName} ${tick}`.trim(),
        phone,
        org: config.ownerName,
        url: config.repoUrl,
      }));
    }

    // .vcard 2348012345678 Some Name   → one card
    // .vcard 2348012345678 2348099999999 → batch
    const numbers = args.filter(looksLikeNumber).slice(0, 5);
    if (!numbers.length) return reply({ text: 'Usage:\n.vcard\n.vcard 2348012345678 Name Here' });

    const nameParts = args.filter((a) => !looksLikeNumber(a));
    if (numbers.length === 1) {
      const name = nameParts.join(' ').trim() || numbers[0];
      return reply(contactMessage({ name: `${name} ${tick}`.trim(), phone: numbers[0], org: config.botName }));
    }
    return reply(contactsMessage(numbers.map((n) => ({ name: n, phone: n, org: config.botName }))));
  },
};
