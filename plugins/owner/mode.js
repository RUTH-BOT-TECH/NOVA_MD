export default {
  name: 'mode',
  category: 'owner',
  description: 'Switch between public and self (owner-only) mode',
  usage: '.mode public|self',
  ownerOnly: true,
  async run({ args, reply, config }) {
    const next = (args[0] || '').toLowerCase();
    if (!['public', 'self'].includes(next)) {
      return reply({ text: `Current mode: *${config.mode}*\nUse .mode public | self` });
    }
    config.mode = next;
    await reply({ text: `⚙️ Bot mode set to *${next}* (runtime only — set MODE in .env to persist).` });
  },
};
