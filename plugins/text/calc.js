export default {
  name: 'calc',
  aliases: ['math', 'calculate'],
  category: 'text',
  description: 'Evaluate a math expression',
  usage: '.calc (12 + 8) * 3 / 4',
  async run({ argsText, reply }) {
    const expr = String(argsText || '').trim();
    if (!expr) return reply({ text: 'Usage: .calc 2 * (3 + 4)' });
    if (!/^[\d\s+\-*/%().]+$/.test(expr)) {
      return reply({ text: '❌ Only numbers and + - * / % ( ) are allowed.' });
    }
    try {
      const result = Number(Function(`"use strict";return (${expr})`)());
      if (!Number.isFinite(result)) throw new Error('not finite');
      await reply({ text: `🧮 \`${expr}\` = *${Number(result.toFixed(10))}*` });
    } catch {
      await reply({ text: '❌ Could not evaluate that expression.' });
    }
  },
};
