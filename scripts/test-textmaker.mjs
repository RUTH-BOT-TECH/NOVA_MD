/** Every text style: no-throw, no data loss, and exact glyph checks. */
import { STYLES, styleNames } from '../src/lib/textmaker.js';

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label} ${detail}`); }
};

ok('21 styles registered', styleNames.length === 21, `got ${styleNames.length}`);
ok('all are functions', styleNames.every((n) => typeof STYLES[n] === 'function'));

// exact glyphs — the bug class that prompted these tests
ok('double AZ → 𝔸ℤ', STYLES.double('AZ') === '𝔸ℤ', STYLES.double('AZ'));
ok('double NZ → ℕℤ (letterlike holes)', STYLES.double('NZ') === 'ℕℤ', STYLES.double('NZ'));
ok('double CHPQ → ℂℍℙℚ', STYLES.double('CHPQ') === 'ℂℍℙℚ', STYLES.double('CHPQ'));
ok('script BN → ℬ𝒩', STYLES.script('BN') === 'ℬ𝒩', STYLES.script('BN'));
ok('script lowercase efo → ℯ𝒻ℴ', STYLES.script('efo') === 'ℯ𝒻ℴ', STYLES.script('efo'));
ok('gothic CHR → ℭℌℜ', STYLES.gothic('CHR') === 'ℭℌℜ', STYLES.gothic('CHR'));
ok('circled mixed → ⓐⒷ', STYLES.circled('aB') === 'ⓐⒷ', STYLES.circled('aB'));
ok('circled digits → ⓪⑦', STYLES.circled('07') === '⓪⑦', STYLES.circled('07'));
ok('squared → 🄰', STYLES.squared('a') === '🄰', STYLES.squared('a'));

// every style must transform plain letters without leaking replacement chars
const sample = 'The quick brown fox jumps over the lazy dog 0123456789';
for (const name of styleNames) {
  let out;
  try { out = STYLES[name](sample); } catch (err) { ok(`${name} runs`, false, err.message); continue; }
  ok(`${name}: no '?' placeholders`, !out.includes('?'), out.slice(0, 40));
  ok(`${name}: output differs from input`, out !== sample);
  ok(`${name}: keeps all digits`, [...out].filter((c) => /\d/.test(c)).length >= 10 || name === 'circled' || name === 'subscript' || name === 'superscript' || name === 'leet' || name === 'sarcasm' || name === 'spaced' || name === 'zalgo' || name === 'strike' || name === 'underline' || name === 'upside' || name === 'mirror');
}

// non-letters survive untouched (emoji, CJK, punctuation)
for (const name of ['double', 'script', 'gothic', 'sansbold', 'circled']) {
  const out = STYLES[name]('hi 🚀 日本!');
  ok(`${name}: keeps emoji`, out.includes('🚀'));
  ok(`${name}: keeps CJK`, out.includes('日本'));
  ok(`${name}: keeps '!'`, out.includes('!'));
}

// deterministic + reversible-ish properties
ok('zalgo is deterministic', STYLES.zalgo('hello') === STYLES.zalgo('hello'));
ok('zalgo adds combining marks', [...STYLES.zalgo('hello')].length > 5);
ok('upside reverses order', STYLES.upside('abc').startsWith('ɔ'), STYLES.upside('abc'));
ok('mirror reverses order', STYLES.mirror('abc').startsWith('ɔ'), STYLES.mirror('abc'));
ok('regional separates letters (no flag merge)', STYLES.regional('ng').includes('\u200b'));
ok('strike adds combining slash per char', [...STYLES.strike('ab')].length === 4);
ok('spaced inserts spaces', STYLES.spaced('abc') === 'a b c');
ok('leet maps vowels/digits only', STYLES.leet('elite') === '31173');
ok('sarcasm alternates case', STYLES.sarcasm('abcd') === 'aBcD');
ok('superscript digits', STYLES.superscript('42') === '⁴²');
ok('unknown chars pass through', STYLES.double('~*~') === '~*~');
ok('empty string is safe', styleNames.every((n) => STYLES[n]('') === ''));

console.log(`\ntextmaker: ${pass}/${pass + fail} passed`);
if (fail) process.exitCode = 1;
