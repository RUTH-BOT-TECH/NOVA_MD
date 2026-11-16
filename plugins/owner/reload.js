export default {
  name: 'reload',
  aliases: ['restart'],
  category: 'owner',
  description: 'Hot-reload every plugin from disk without dropping the session',
  usage: '.reload',
  ownerOnly: true,
  async run({ reply, runtime }) {
    if (!runtime.reload) return reply({ text: '❌ Reload is not wired up.' });
    const count = await runtime.reload();
    await reply({ text: `♻️ Reloaded plugins — ${count} commands live.` });
  },
};
