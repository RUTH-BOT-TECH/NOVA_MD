import { STYLES, styleNames } from '../../src/lib/textmaker.js';

/**
 * One command per style, all driven by src/lib/textmaker.js so the transforms
 * are unit-tested independently of WhatsApp.
 */

const STYLE_META = {
  circled:     ['Circled letters', ['round', 'encircle']],
  squared:     ['Squared letters', ['square', 'boxed']],
  negcircled:  ['Negative circled letters', ['negcircle']],
  gothic:      ['Gothic / fraktur', ['fraktur', 'blackletter']],
  double:      ['Double-struck (outline)', ['outline', 'blackboard']],
  script:      ['Cursive script', ['calligraphy'], 'cursive'],
  sansbold:    ['Sans-serif bold', ['thick']],
  sansitalic:  ['Sans-serif italic', ['slanted']],
  bolditalic:  ['Bold italic', ['heavyital']],
  monospace:   ['Monospace / code', ['code', 'typewriter']],
  superscript: ['Superscript', ['super']],
  subscript:   ['Subscript', ['sub']],
  upside:      ['Upside down (reversed)', ['upsidedown', 'down']],
  mirror:      ['Mirrored', ['backwards', 'mirrored'], 'mirrortext'],
  strike:      ['Strikethrough', ['strikethru', 'crossout']],
  underline:   ['Underline', ['under']],
  regional:    ['Regional indicator letters', ['flags', 'indicator']],
  zalgo:       ['Zalgo (glitch text)', ['cursed', 'chaos']],
  leet:        ['Leetspeak', ['1337', 'hacker']],
  spaced:      ['Spaced out', ['wide', 'spread']],
  sarcasm:     ['Mocking case', ['sarcastic', 'spongebob']],
};

const command = (style) => {
  const [description, aliases, override] = STYLE_META[style] || [style, [], style];
  const name = override || style;
  return {
    name,
    aliases,
    category: 'textmaker',
    description,
    usage: `.${name} <text>`,
    async run({ argsText, reply, prefix, command: cmd }) {
      const text = String(argsText || '').trim();
      if (!text) return reply({ text: `Usage: ${prefix}${cmd} your text here` });
      await reply({ text: STYLES[style](text.slice(0, 500)) });
    },
  };
};

export default [
  ...styleNames.map(command),

  {
    name: 'textmaker',
    aliases: ['styles', 'allfonts'],
    category: 'textmaker',
    description: 'Show your text in every style at once',
    usage: '.textmaker <text>',
    cooldownMs: 2000,
    async run({ argsText, reply }) {
      const text = String(argsText || '').trim();
      if (!text) return reply({ text: 'Usage: .textmaker your text here' });
      const short = text.slice(0, 40);
      const lines = styleNames.map((n) => `┃ ${n.padEnd(11)} ${STYLES[n](short)}`);
      await reply({ text: ['┏❐ 《 ꜱᴛʏʟᴇꜱ 》 ❐', ...lines, '┗❐'].join('\n') });
    },
  },

  {
    name: 'unstyle',
    aliases: ['plain'],
    category: 'textmaker',
    description: 'Best-effort plain text: strips unicode letters + combining marks',
    usage: '.unstyle <fancy text>',
    async run({ argsText, reply }) {
      const text = String(argsText || '').trim();
      if (!text) return reply({ text: 'Usage: .unstyle <fancy text>' });
      // fold every style back by inverting the alphabets, then drop combining marks
      const plain = [...text.normalize('NFKD')]
        .filter((c) => !/[\u0300-\u036f\u20d0-\u20ff\u200b-\u200d]/.test(c))
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
      await reply({ text: plain || '(nothing left after stripping)' });
      // note: real ciphers (.leet, .upside, .mirror) aren't reversible this way
    },
  },
];
