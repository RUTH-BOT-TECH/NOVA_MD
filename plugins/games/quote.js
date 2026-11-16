const QUOTES = [
  ['Do not watch the clock. Do what it does: keep going.', 'Sam Levenson'],
  ['Simplicity is the soul of efficiency.', 'Austin Freeman'],
  ['The best error message is the one that never shows up.', 'Thomas Fuchs'],
  ['First solve the problem, then write the code.', 'John Johnson'],
  ['Programs must be written for people to read.', 'Harold Abelson'],
  ['Slow is smooth, smooth is fast.', 'Abhimanyu Das'],
  ['Discipline beats motivation, every single day.', 'Unknown'],
  ['You do not rise to the level of your goals, you fall to the level of your systems.', 'James Clear'],
  ['Talk is cheap. Show me the code.', 'Linus Torvalds'],
  ['Any fool can write code a computer understands; good programmers write code humans understand.', 'Martin Fowler'],
];

export default {
  name: 'quote',
  aliases: ['quotes'],
  category: 'games',
  description: 'A random quote',
  usage: '.quote',
  async run({ reply }) {
    const [text, author] = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    await reply({ text: `❝ _${text}_ ❞\n\n— *${author}*` });
  },
};
