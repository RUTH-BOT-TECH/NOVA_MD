import { row, sc, duration } from '../../src/lib/ui.js';
import { hostName } from '../../src/lib/system.js';

/**
 * `.ping` — the one command everybody runs first, so it should answer the
 * question they actually have: "is this thing alive, and is it healthy?"
 *
 * Everything here is measured: the round-trip is the time this reply took, the
 * uptime comes from the process, the memory is the real RSS, and the plugin
 * count is the loaded registry. Nothing is hardcoded.
 */
export default {
  name: 'ping',
  aliases: ['p'],
  category: 'general',
  description: 'Check that the bot is alive and how fast it replies',
  usage: '.ping',
  async run({ reply, runtime, registry, sock, config }) {
    const started = Date.now();

    const plugins = registry ? new Set(registry.values()).size : 0;
    const uptimeMs = runtime?.uptime?.() ?? process.uptime() * 1000;
    const rss = process.memoryUsage().rss;
    const connected = Boolean(sock?.user);
    const latency = Date.now() - started;

    // a five-cell bar, so speed is readable at a glance instead of a number
    const filled = latency < 80 ? 5 : latency < 200 ? 4 : latency < 500 ? 3 : latency < 1000 ? 2 : 1;
    const bar = `${'█'.repeat(filled)}${'░'.repeat(5 - filled)}`;

    await reply({
      text: [
        '┏❐ 《 ᴘɪɴɢ 》 ❐',
        row('round-trip', `${latency}ms ${bar}`),
        row('uptime', duration(uptimeMs)),
        row('memory', `${(rss / 1024 / 1024).toFixed(1)} MB`),
        row('plugins', String(plugins)),
        row('host', hostName()),
        row('status', connected ? '✅ connected' : '⚠️ not linked yet'),
        `┃ ${sc('prefix')} : ${config?.prefixes?.join(' ') || '.'}`,
        '┗❐',
      ].join('\n'),
    });
  },
};
