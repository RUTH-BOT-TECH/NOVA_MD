/**
 * Unicode text styles — pure functions, no deps.
 *
 * Two of these blocks are NOT contiguous in Unicode (double-struck and
 * script/fraktur reuse letterlike symbols like ℂ ℍ ℕ ℤ), so those use
 * explicit alphabets instead of arithmetic offsets. Getting that wrong
 * silently produces the wrong glyph, which is why scripts/test-textmaker.mjs
 * asserts actual code points.
 */

const A2Z = 'abcdefghijklmnopqrstuvwxyz';
const idx = (ch) => {
  const lower = ch.toLowerCase();
  const i = A2Z.indexOf(lower);
  return i === -1 ? -1 : i;
};

/** Astral characters are surrogate pairs, so alphabets MUST be split into code points. */
const chars = (str) => [...str];

const ALPHABETS = {
  gothic: {
    upper: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ',
    lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
  },
  double: {
    upper: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
    lower: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
  },
  script: {
    upper: '𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵',
    lower: '𝒶𝒷𝒸𝒹ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏',
  },
};

// contiguous blocks: safe to compute with offsets
const OFFSETS = {
  sansbold:   [0x1d5d4, 0x1d5ee],
  sansitalic: [0x1d608, 0x1d622],
  bolditalic: [0x1d63c, 0x1d656],
  monospace:  [0x1d670, 0x1d68a],
};

const CIRCLED_UPPER = 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ';
const CIRCLED_LOWER = 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ';
const CIRCLED_DIGITS = '⓪①②③④⑤⑥⑦⑧⑨';
const SQUARED_UPPER = '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉';
const NEG_UPPER = '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩';

const SUPER = { a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ⁱ',j:'ʲ',k:'ᵏ',l:'ˡ',m:'ᵐ',n:'ⁿ',o:'ᵒ',p:'ᵖ',q:'ᵠ',r:'ʳ',s:'ˢ',t:'ᵗ',u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ',0:'⁰',1:'¹',2:'²',3:'³',4:'⁴',5:'⁵',6:'⁶',7:'⁷',8:'⁸',9:'⁹',i2:'ⁱ' };
const SUB = { a:'ₐ',e:'ₑ',h:'ₕ',i:'ᵢ',j:'ⱼ',k:'ₖ',l:'ₗ',m:'ₘ',n:'ₙ',o:'ₒ',p:'ₚ',r:'ᵣ',s:'ₛ',t:'ₜ',u:'ᵤ',v:'ᵥ',x:'ₓ',0:'₀',1:'₁',2:'₂',3:'₃',4:'₄',5:'₅',6:'₆',7:'₇',8:'₈',9:'₉' };

const FLIPPED = {
  a:'ɐ',b:'q',c:'ɔ',d:'p',e:'ǝ',f:'ɟ',g:'ƃ',h:'ɥ',i:'ᴉ',j:'ɾ',k:'ʞ',l:'ן',m:'ɯ',n:'u',o:'o',p:'d',q:'b',r:'ɹ',s:'s',t:'ʇ',u:'n',v:'ʌ',w:'ʍ',x:'x',y:'ʎ',z:'z',
  A:'∀',B:'𐐒',C:'Ɔ',D:'◖',E:'Ǝ',F:'Ⅎ',G:'⅁',H:'H',I:'I',J:'ſ',K:'⋊',L:'˥',M:'W',N:'N',O:'O',P:'Ԁ',Q:'Ό',R:'ᴚ',S:'S',T:'⊥',U:'∩',V:'Λ',W:'M',X:'X',Y:'⅄',Z:'Z',
  '?':'¿','!':'¡',',':"'",'.':'˙','_':'‾','(':')',')':'(','[':']',']':'[','{':'}','}':'{','<':'>','>':'<','&':'⅋','1':'Ɩ','2':'ᄅ','3':'Ɛ','4':'ㄣ','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6','0':'0',
};
const MIRRORED = {
  a:'ɒ',b:'d',c:'ɔ',d:'b',e:'ɘ',f:'ꟻ',g:'ǫ',h:'ʜ',i:'i',j:'ꞁ',k:'ʞ',l:'l',m:'m',n:'n',o:'o',p:'q',q:'p',r:'ɿ',s:'ꙅ',t:'ƚ',u:'u',v:'v',w:'w',x:'x',y:'ʏ',z:'ƹ',
  A:'A',B:'ᙠ',C:'Ɔ',D:'ᗡ',E:'Ǝ',F:'ꟻ',G:'Ә',H:'H',I:'I',J:'Ⴑ',K:'ʞ',L:'⅃',M:'M',N:'И',O:'O',P:'ꟼ',Q:'Ϙ',R:'Я',S:'Ƨ',T:'T',U:'U',V:'V',W:'W',X:'X',Y:'Y',Z:'Ƹ',
  '(':')',')':'(','[':']',']':'[','<':'>','>':'<','{':'}','}':'{','/':'\\','\\':'/',
};

const LEET = { a:'4',b:'8',e:'3',g:'6',i:'1',l:'1',o:'0',s:'5',t:'7',z:'2' };

const ALPHA = Object.fromEntries(Object.entries(ALPHABETS).map(([k, v]) => [k, { upper: chars(v.upper), lower: chars(v.lower) }]));
const UPPER_ONLY = {
  circledUpper: chars(CIRCLED_UPPER),
  circledLower: chars(CIRCLED_LOWER),
  squared: chars(SQUARED_UPPER),
  neg: chars(NEG_UPPER),
};

function fromAlphabet(text, key) {
  const { upper, lower } = ALPHA[key];
  return [...text].map((ch) => {
    const i = idx(ch);
    if (i === -1) return ch;
    const isUpper = ch === ch.toUpperCase() && ch !== ch.toLowerCase();
    return isUpper ? upper[i] : lower[i];
  }).join('');
}

function fromOffset(text, [upperBase, lowerBase]) {
  return [...text].map((ch) => {
    const i = idx(ch);
    if (i === -1) return ch;
    const isUpper = ch === ch.toUpperCase() && ch !== ch.toLowerCase();
    return String.fromCodePoint((isUpper ? upperBase : lowerBase) + i);
  }).join('');
}

function fromUpperOnly(text, alphabet) {
  const table = UPPER_ONLY[alphabet] || chars(alphabet);
  return [...text].map((ch) => {
    const i = idx(ch);
    return i === -1 ? ch : table[i];
  }).join('');
}

/** Deterministic zalgo: same input → same output, so it's testable. */
function zalgo(text, intensity = 2) {
  const marks = [0x0300,0x0301,0x0302,0x0303,0x0308,0x030a,0x0313,0x0315,0x0330,0x0334,0x0335,0x0336,0x0348,0x0353,0x0356,0x035b];
  let seed = 7;
  for (const ch of text) seed = (seed * 31 + ch.codePointAt(0)) % 100000;
  return [...text].map((ch) => {
    if (ch === ' ') return ch;
    let out = ch;
    for (let i = 0; i < intensity; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      out += String.fromCodePoint(marks[seed % marks.length]);
    }
    return out;
  }).join('');
}

export const STYLES = {
  circled: (t) => [...t].map((c) => {
    if (/\d/.test(c)) return chars(CIRCLED_DIGITS)[Number(c)];
    const isUpper = c === c.toUpperCase() && c !== c.toLowerCase();
    return fromUpperOnly(c, isUpper ? 'circledUpper' : 'circledLower');
  }).join(''),
  squared:     (t) => fromUpperOnly(t, 'squared'),
  negcircled:  (t) => fromUpperOnly(t, 'neg'),
  gothic:      (t) => fromAlphabet(t, 'gothic'),
  double:      (t) => fromAlphabet(t, 'double'),
  script:      (t) => fromAlphabet(t, 'script'),
  sansbold:    (t) => fromOffset(t, OFFSETS.sansbold),
  sansitalic:  (t) => fromOffset(t, OFFSETS.sansitalic),
  bolditalic:  (t) => fromOffset(t, OFFSETS.bolditalic),
  monospace:   (t) => fromOffset(t, OFFSETS.monospace),
  superscript: (t) => [...t].map((c) => SUPER[c] || SUPER[c.toLowerCase()] || c).join(''),
  subscript:   (t) => [...t].map((c) => SUB[c] || SUB[c.toLowerCase()] || c).join(''),
  upside:      (t) => [...t].reverse().map((c) => FLIPPED[c] || c).join(''),
  mirror:      (t) => [...t].reverse().map((c) => MIRRORED[c] || c).join(''),
  strike:      (t) => [...t].map((c) => (c === ' ' ? c : `${c}\u0336`)).join(''),
  underline:   (t) => [...t].map((c) => (c === ' ' ? c : `${c}\u0332`)).join(''),
  // zero-width space keeps consecutive letters from merging into a flag emoji
  regional:    (t) => [...t].map((c) => {
    const u = c.toUpperCase().codePointAt(0);
    return u >= 65 && u <= 90 ? `${String.fromCodePoint(0x1f1e6 + (u - 65))}\u200b` : c;
  }).join(''),
  zalgo:       (t) => zalgo(t),
  leet:        (t) => [...t].map((c) => LEET[c.toLowerCase()] || c).join(''),
  spaced:      (t) => [...t].join(' '),
  sarcasm:     (t) => [...t].map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase())).join(''),
};

export const styleNames = Object.keys(STYLES);
