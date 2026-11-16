const RANGES = {
  bold:      { upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
  italic:    { upper: 0x1d608, lower: 0x1d622, digit: null },
  monospace: { upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
};
const SMALL = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };

function convert(text, style) {
  const r = RANGES[style];
  if (!r) return text;
  return [...text].map((ch) => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(r.upper + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(r.lower + (c - 97));
    if (c >= 48 && c <= 57 && r.digit) return String.fromCodePoint(r.digit + (c - 48));
    return ch;
  }).join('');
}

const smallCaps = (t) => [...t.toLowerCase()].map((c) => SMALL[c] || c).join('');
const fullwidth = (t) => [...t].map((ch) => {
  const c = ch.codePointAt(0);
  if (c >= 33 && c <= 126) return String.fromCodePoint(c + 0xfee0);
  return ch === ' ' ? '\u3000' : ch;
}).join('');

export default {
  name: 'fancy',
  aliases: ['style', 'font'],
  category: 'text',
  description: 'Convert text into unicode styles for names and bios',
  usage: '.fancy <text>',
  async run({ argsText, reply }) {
    if (!argsText) return reply({ text: 'Usage: .fancy your text here' });
    await reply({
      text: [
        `*bold*      ${convert(argsText, 'bold')}`,
        `*italic*    ${convert(argsText, 'italic')}`,
        `*mono*      ${convert(argsText, 'monospace')}`,
        `*small*     ${smallCaps(argsText)}`,
        `*wide*      ${fullwidth(argsText)}`,
      ].join('\n'),
    });
  },
};
