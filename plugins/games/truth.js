const TRUTHS = [
  'What is the last lie you told?', 'Who in this group do you trust the least?',
  'What is your most embarrassing moment?', 'Have you ever pretended to like a gift?',
  'What is the biggest mistake you made this year?', 'Which app do you waste the most time on?',
  'What is one thing you would never tell your parents?', 'Who was your first crush?',
  'What is the pettiest reason you stopped talking to someone?', 'What is your worst habit?',
];

export default {
  name: 'truth',
  category: 'games',
  description: 'Get a truth question',
  usage: '.truth',
  async run({ reply, pushName }) {
    const q = TRUTHS[Math.floor(Math.random() * TRUTHS.length)];
    await reply({ text: `🫣 *Truth for ${pushName || 'you'}*\n\n${q}` });
  },
};
