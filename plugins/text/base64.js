export default {
  name: 'base64',
  aliases: ['b64'],
  category: 'text',
  description: 'Base64 encode or decode text',
  usage: '.base64 encode <text> | .base64 decode <text>',
  async run({ args, argsText, reply }) {
    const mode = (args[0] || '').toLowerCase();
    const payload = argsText.slice(args[0]?.length || 0).trim();

    if (!['encode', 'decode'].includes(mode) || !payload) {
      return reply({ text: 'Usage:\n.base64 encode hello\n.base64 decode aGVsbG8=' });
    }
    if (mode === 'encode') {
      return reply({ text: `\`\`\`${Buffer.from(payload, 'utf8').toString('base64')}\`\`\`` });
    }
    let out;
    try {
      out = Buffer.from(payload, 'base64').toString('utf8');
      if (!out || /[\uFFFD]/.test(out)) throw new Error('not text');
    } catch {
      return reply({ text: '❌ That is not valid base64 text.' });
    }
    await reply({ text: `\`\`\`${out}\`\`\`` });
  },
};
