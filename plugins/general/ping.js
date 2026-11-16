export default {
  name: 'ping',
  aliases: ['p'],
  category: 'general',
  description: 'Check that the bot is alive and how fast it replies',
  usage: '.ping',
  async run({ reply, msg }) {
    const t = Date.now();
    await reply({ text: '🏓 pinging…' });
    await reply({ text: `🏓 *pong!*\nround-trip: ${Date.now() - t}ms` });
  },
};
