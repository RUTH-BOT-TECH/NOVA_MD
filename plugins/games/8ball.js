const ANSWERS = [
  'It is certain.', 'Without a doubt.', 'Yes — definitely.', 'You may rely on it.',
  'Most likely.', 'Outlook good.', 'Signs point to yes.', 'Ask again later.',
  'Cannot predict now.', 'Concentrate and ask again.', "Don't count on it.",
  'My reply is no.', 'My sources say no.', 'Outlook not so good.', 'Very doubtful.',
];

export default {
  name: '8ball',
  aliases: ['eightball'],
  category: 'games',
  description: 'Ask the magic 8-ball a yes/no question',
  usage: '.8ball will I be rich?',
  async run({ argsText, reply, pushName }) {
    if (!argsText) return reply({ text: 'Usage: .8ball <question>' });
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    await reply({ text: `🎱 *${pushName || 'You'}* asks: _${argsText}_\n\n➜ *${answer}*` });
  },
};
