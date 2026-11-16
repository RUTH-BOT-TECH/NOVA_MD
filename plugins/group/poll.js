export default {
  name: 'poll',
  category: 'group',
  description: 'Create a poll — .poll question | opt1 | opt2',
  usage: '.poll Best stack? | Node | Go | Rust',
  groupOnly: true,
  adminOnly: true,
  async run({ argsText, sock, jid, reply }) {
    const [name, ...values] = String(argsText || '').split('|').map((s) => s.trim()).filter(Boolean);
    if (!name || values.length < 2) {
      return reply({ text: 'Usage: .poll Question | option 1 | option 2' });
    }
    if (values.length > 12) return reply({ text: '❌ WhatsApp allows at most 12 options.' });
    await sock.sendMessage(jid, { poll: { name, values, selectableCount: 1 } });
  },
};
