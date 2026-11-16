import crypto from 'node:crypto';

const pick = (arr) => arr[crypto.randomInt(arr.length)];

const simple = (name, description, build, aliases = []) => ({
  name,
  aliases,
  category: 'fun',
  description,
  usage: `.${name}`,
  async run(ctx) {
    await ctx.reply({ text: build(ctx) });
  },
});

const JOKES = [
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'A SQL query walks into a bar, walks up to two tables and asks: “Can I join you?”',
  'There are 10 kinds of people: those who understand binary and those who do not.',
  'I told my bot a joke about UDP. Not sure it got it.',
  'Why did the developer go broke? He used up all his cache.',
  'It works on my machine. Then we ship your machine.',
  'My code does not have bugs, it has random features.',
  'WhatsApp bot on a Friday night: “connection closed, reconnecting…”',
];

const FACTS = [
  'A group of flamingos is called a flamboyance.',
  'Honey never spoils — edible 3,000-year-old jars exist.',
  'Octopuses have three hearts and blue blood.',
  'Bananas are berries; strawberries technically are not.',
  'The first computer bug was a literal moth, found in 1947.',
  'Wi-Fi does not stand for anything — it was invented by a marketing agency.',
  'An adult human has about 37 trillion cells.',
  'Lightning is roughly five times hotter than the surface of the sun.',
];

const RIDDLES = [
  ['I speak without a mouth and hear without ears. What am I?', 'An echo'],
  ['The more you take, the more you leave behind. What are they?', 'Footsteps'],
  ['I have keys but no locks. What am I?', 'A keyboard'],
  ['What has to be broken before you can use it?', 'An egg'],
  ['What gets wetter the more it dries?', 'A towel'],
  ['I am not alive, but I grow; I have no lungs, but I need air. What am I?', 'Fire'],
];

const COMPLIMENTS = [
  'Your code reviews probably make people better developers.',
  'You explain hard things without making people feel stupid.',
  'You fix things nobody else notices are broken.',
  'Your commits have messages. That alone puts you in the top 10%.',
  'You ask the question everyone else was too proud to ask.',
];

const INSULTS = [
  'You are the reason the manual says “do not eat” on a packet of peanuts.',
  'Your pull requests get merged out of pity.',
  'You debug by commenting things out until it works, and that is your whole process.',
  'You type “sudo” at home just to feel something.',
  'Your idea of caching is remembering what you had for lunch.',
];

const WYR = [
  'Never use WhatsApp again, or never use the internet again?',
  'Read every message you ever sent, or have everyone read yours?',
  'Have unlimited data but 2G speed, or 1GB at 5G speed?',
  'Always type with your non-dominant hand, or always speak in emojis?',
  'Get 8 hours of sleep every night, or never need sleep again?',
];

const NHIE = [
  '…pretended to be offline to avoid a chat.',
  '…sent a message to the wrong group and deleted it in a panic.',
  '…left a group just to avoid one person.',
  '…screenshot a conversation and shared it.',
  '…used a bot to win an argument.',
];

const HOROSCOPE = {
  aries: 'Start the thing you have been postponing — momentum is on your side today.',
  taurus: 'Say no once, without explaining yourself. It will feel better than yes.',
  gemini: 'Two good ideas, one deadline. Pick the smaller one and finish it.',
  cancer: 'Someone needs your calm more than your advice. Listen first.',
  leo: 'Your work is better than you think. Show it before you polish it again.',
  virgo: 'The imperfect version shipped beats the perfect version drafted.',
  libra: 'Stop collecting options. The third one you liked is the answer.',
  scorpio: 'Let go of the grudge; it is costing you more than it costs them.',
  sagittarius: 'Say yes to the small detour. That is where today’s good news is.',
  capricorn: 'Rest is part of the plan, not a break from it.',
  aquarius: 'Your weird idea is the useful one. Write it down before you doubt it.',
  pisces: 'Boundaries today, softness tomorrow. You can do both.',
};

export default [
  simple('coinflip', 'Heads or tails', () => `🪙 *${pick(['Heads', 'Tails'])}*`, ['cointoss']),
  simple('joke', 'Random programming joke', () => `😄 ${pick(JOKES)}`, ['jokes']),
  simple('fact', 'Random fact', () => `💡 ${pick(FACTS)}`),
  simple('compliment', 'Compliment someone', ({ argsText }) => `💚 ${argsText ? `@${argsText.replace(/[^0-9]/g, '')} ` : ''}${pick(COMPLIMENTS)}`),
  simple('insult', 'Playful insult', ({ argsText }) => `😈 ${argsText ? `@${argsText.replace(/[^0-9]/g, '')} ` : ''}${pick(INSULTS)}`),
  simple('wouldyourather', 'Would you rather…', () => `🤔 *Would you rather…*\n\n${pick(WYR)}`, ['wyr']),
  simple('neverhaveiever', 'Never have I ever…', () => `🙈 *Never have I ever*${pick(NHIE)}`, ['nhie']),

  {
    name: 'riddle',
    category: 'fun',
    description: 'A riddle — answer with .answer',
    usage: '.riddle',
    async run({ reply, store, jid }) {
      const [q, a] = pick(RIDDLES);
      store.set(jid, { riddle: a });
      await reply({ text: `🧩 *Riddle*\n\n${q}\n\n_Reply with .answer <your guess>_` });
    },
  },
  {
    name: 'answer',
    category: 'fun',
    description: 'Answer the active riddle',
    usage: '.answer echo',
    async run({ argsText, reply, store, jid }) {
      const expected = store.get(jid, 'riddle', null);
      if (!expected) return reply({ text: 'No active riddle. Try .riddle first.' });
      const ok = String(argsText || '').toLowerCase().includes(String(expected).toLowerCase().split(' ').pop());
      store.set(jid, { riddle: null });
      await reply({ text: ok ? `✅ Correct — it was *${expected}*.` : `❌ Nope. The answer was *${expected}*.` });
    },
  },
  {
    name: 'ship',
    aliases: ['lovemeter'],
    category: 'fun',
    description: 'Ship two people — .ship Name1 & Name2',
    usage: '.ship Nova & Dante',
    async run({ argsText, reply, pushName }) {
      const raw = String(argsText || '').split(/&|,|\band\b/).map((s) => s.trim()).filter(Boolean);
      if (raw.length < 2) return reply({ text: 'Usage: .ship Name1 & Name2' });
      const [a, b] = raw;
      // stable hash so the same pair always gets the same score
      const score = crypto.createHash('sha256').update([a, b].sort().join('|')).digest()[0] % 101;
      const bar = '█'.repeat(Math.round(score / 10)).padEnd(10, '░');
      const verdict = score > 80 ? 'soulmates 💍' : score > 60 ? 'very compatible 💚' : score > 40 ? 'there is something there 👀' : score > 20 ? 'friendzone material 🫂' : 'run 🏃';
      await reply({ text: `💘 *${a}* + *${b}*\n[${bar}] ${score}%\n${verdict}` });
    },
  },
  {
    name: 'rps',
    aliases: ['rockpaperscissors'],
    category: 'fun',
    description: 'Rock paper scissors — .rps rock',
    usage: '.rps rock|paper|scissors',
    async run({ args, reply, pushName }) {
      const moves = ['rock', 'paper', 'scissors'];
      const mine = pick(moves);
      const yours = (args[0] || '').toLowerCase();
      if (!moves.includes(yours)) return reply({ text: 'Pick one: .rps rock | paper | scissors' });
      const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
      const result = yours === mine ? '🤝 Draw!' : beats[yours] === mine ? '🎉 You win!' : '🤖 I win!';
      await reply({ text: `You: *${yours}*\nMe: *${mine}*\n\n${result}` });
    },
  },
  {
    name: 'horoscope',
    aliases: ['horoscopes'],
    category: 'fun',
    description: 'Daily horoscope — .horoscope leo',
    usage: '.horoscope <sign>',
    async run({ args, reply }) {
      const sign = (args[0] || '').toLowerCase();
      if (!HOROSCOPE[sign]) return reply({ text: `Signs: ${Object.keys(HOROSCOPE).join(' · ')}` });
      await reply({ text: `♈ *${sign.toUpperCase()}*\n\n${HOROSCOPE[sign]}\n\n_Built-in text, not a live API — treat it as a nudge, not fate._` });
    },
  },
];
