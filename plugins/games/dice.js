import crypto from 'node:crypto';

export default {
  name: 'dice',
  aliases: ['roll'],
  category: 'games',
  description: 'Roll dice — .dice 2d6',
  usage: '.dice [NdM]',
  async run({ args, reply }) {
    const spec = (args[0] || '1d6').toLowerCase();
    const m = spec.match(/^(\d{1,2})d(\d{1,4})$/);
    if (!m) return reply({ text: 'Usage: .dice 2d6 (dice sides)' });
    const [count, sides] = [Math.min(20, Number(m[1])), Math.min(1000, Number(m[2]))];
    if (sides < 2) return reply({ text: 'A die needs at least 2 sides.' });

    const rolls = Array.from({ length: count }, () => crypto.randomInt(1, sides + 1));
    const total = rolls.reduce((a, b) => a + b, 0);
    await reply({ text: `🎲 *${count}d${sides}*\n${rolls.join(' + ')} = *${total}*` });
  },
};
