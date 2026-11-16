export default {
  name: 'alive',
  aliases: ['runtime'],
  category: 'general',
  description: 'Uptime, memory and connection status',
  usage: '.alive',
  async run({ reply, config, runtime, sock }) {
    const mem = process.memoryUsage();
    const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;
    await reply({
      text:
        `*${config.botName}* is running ✅\n\n` +
        `• uptime: ${Math.floor(runtime.uptime() / 1000)}s\n` +
        `• node: ${process.version}\n` +
        `• rss: ${mb(mem.rss)} (heap ${mb(mem.heapUsed)})\n` +
        `• account: ${sock.user?.id || 'not linked'}\n` +
        `• prefix: ${config.prefixes.join(' ')}`,
    });
  },
};
