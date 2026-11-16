import { row } from '../../src/lib/ui.js';

export default {
  name: 'speed',
  aliases: ['latency'],
  category: 'general',
  description: 'Measure WhatsApp API round-trip (3 samples)',
  usage: '.speed',
  cooldownMs: 4000,
  async run({ reply, sock, jid, runtime }) {
    const samples = [];
    for (let i = 0; i < 3; i++) {
      const t = Date.now();
      await sock.sendPresenceUpdate(i % 2 ? 'paused' : 'composing', jid).catch(() => {});
      samples.push(Date.now() - t);
    }
    const min = Math.min(...samples);
    const avg = Math.round(samples.reduce((a, b) => a + b, 0) / samples.length);
    runtime.lastLatency = min;

    await reply({
      text: [
        '┏❐ 《 ꜱᴘᴇᴇᴅ ᴛᴇꜱᴛ 》 ❐',
        row('samples', samples.map((s) => `${s}ms`).join(' · ')),
        row('min', `${min} ms`),
        row('avg', `${avg} ms`),
        row('rating', min < 150 ? '🟢 excellent' : min < 400 ? '🟡 good' : '🔴 slow'),
        '┗❐',
      ].join('\n'),
    });
  },
};
