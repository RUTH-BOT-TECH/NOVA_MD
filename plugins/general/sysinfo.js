import { row, bar, duration } from '../../src/lib/ui.js';
import { systemStats } from '../../src/lib/system.js';

export default {
  name: 'sysinfo',
  aliases: ['stats', 'runtime2'],
  category: 'general',
  description: 'Host, CPU, memory and process details',
  usage: '.sysinfo',
  async run({ reply, runtime }) {
    const s = systemStats();
    const mem = process.memoryUsage();
    await reply({
      text: [
        '┏❐ 《 ꜱʏꜱᴛᴇᴍ 》 ❐',
        row('host', s.host),
        row('platform', s.platform),
        row('arch', s.arch),
        row('node', s.node),
        row('cores', s.cores),
        row('load', s.load),
        row('pid', s.pid),
        row('uptime', duration(runtime.uptime())),
        row('system ram', `${s.mem.usedText} / ${s.mem.totalText}`),
        row('ram use', `${bar(s.mem.percent)} ${s.mem.percent}%`),
        row('process rss', s.mem.rssText),
        row('heap used', `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`),
        '┗❐',
      ].join('\n'),
    });
  },
};
