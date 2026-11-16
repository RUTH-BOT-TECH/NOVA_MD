import crypto from 'node:crypto';
import { row } from '../../src/lib/ui.js';

const SETS = {
  full: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*-_=+',
  alnum: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  pin: '0123456789',
};

export default {
  name: 'password',
  aliases: ['pass', 'gen'],
  category: 'text',
  description: 'Generate a strong random password',
  usage: '.password [length] [full|alnum|pin]',
  async run({ args, reply }) {
    const length = Math.min(128, Math.max(4, Number(args[0]) || 20));
    const set = SETS[(args[1] || 'full').toLowerCase()] || SETS.full;
    let out = '';
    for (let i = 0; i < length; i++) out += set[crypto.randomInt(set.length)];
    await reply({
      text: [`┏❐ 《 ᴘᴀꜱꜱᴡᴏʀᴅ 》 ❐`, row('length', length), row('charset', args[1] || 'full'), '┗❐', '', `\`\`\`${out}\`\`\``].join('\n'),
    });
  },
};
