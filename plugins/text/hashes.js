import crypto from 'node:crypto';

const ALGOS = ['md5', 'sha1', 'sha256', 'sha512', 'sha3-256', 'sha3-512', 'ripemd160'];

const digest = (algo, text) => crypto.createHash(algo).update(text, 'utf8').digest('hex');

const hasher = (name, algo, aliases = []) => ({
  name,
  aliases,
  category: 'text',
  description: `${algo.toUpperCase()} hash of text`,
  usage: `.${name} <text>`,
  async run({ argsText, reply, prefix, command }) {
    const input = String(argsText || '').trim();
    if (!input) return reply({ text: `Usage: ${prefix}${command} <text>` });
    await reply({ text: `\`\`\`${digest(algo, input)}\`\`\`` });
  },
});

export default [
  hasher('md5', 'md5'),
  hasher('sha1', 'sha1'),
  hasher('sha256', 'sha256'),
  hasher('sha512', 'sha512'),
  {
    name: 'hash',
    category: 'text',
    description: 'Hash text with any algorithm',
    usage: '.hash sha256 <text>',
    async run({ args, argsText, reply }) {
      const algo = (args[0] || '').toLowerCase();
      const body = argsText.replace(/^\S+\s*/, '').trim();
      if (!ALGOS.includes(algo) || !body) {
        return reply({ text: `Usage: .hash <${ALGOS.join('|')}> <text>` });
      }
      await reply({ text: `\`\`\`${digest(algo, body)}\`\`\`` });
    },
  },
  {
    name: 'uuid',
    aliases: ['guid'],
    category: 'text',
    description: 'Generate a random UUID v4',
    usage: '.uuid',
    async run({ reply }) {
      await reply({ text: `\`\`\`${crypto.randomUUID()}\`\`\`` });
    },
  },
  {
    name: 'random-string',
    aliases: ['randstr', 'randomstring'],
    category: 'text',
    description: 'Random string — .random-string [length] [hex|alnum|base64]',
    usage: '.random-string 24 hex',
    async run({ args, reply }) {
      const len = Math.min(256, Math.max(4, parseInt(args[0], 10) || 16));
      const mode = (args[1] || 'alnum').toLowerCase();
      const chars = {
        hex: '0123456789abcdef',
        alnum: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789',
        base64: 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789+/',
        digits: '0123456789',
      }[mode] || 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let out = '';
      for (let i = 0; i < len; i++) out += chars[crypto.randomInt(chars.length)];
      await reply({ text: `\`\`\`${out}\`\`\`` });
    },
  },
  {
    name: 'lorem',
    aliases: ['lipsum'],
    category: 'text',
    description: 'Placeholder lorem ipsum text',
    usage: '.lorem [sentences 1-5]',
    async run({ args, reply }) {
      const n = Math.min(5, Math.max(1, parseInt(args[0], 10) || 2));
      const pool = [
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
        'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
        'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
      ];
      await reply({ text: pool.slice(0, n).join(' ') });
    },
  },
];
