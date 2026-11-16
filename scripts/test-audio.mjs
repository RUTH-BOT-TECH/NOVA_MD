/**
 * Audio pipeline tests. ffmpeg is NOT installed here, so this verifies:
 *   1. the argument builders are correct (pure, exact strings)
 *   2. every command degrades to install instructions instead of crashing
 *   3. `.take` really stamps pack metadata using sharp only
 */
import { BUILDS, parseTime, hasFfmpeg } from '../src/lib/ffmpeg.js';
import { buildStickerExif, stampWebpExif, readStickerExif, EXIF_HEADER } from '../src/lib/webp-exif.js';
import { loadPlugins } from '../src/lib/loader.js';
import sharp from 'sharp';

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label} ${detail}`); }
};

// ── argument builders ─────────────────────────────────────────────────────
ok('tomp3 strips video and uses lame', BUILDS.tomp3().args.join(' ') === '-vn -acodec libmp3lame -b:a 128k');
ok('tovoice uses opus + voip profile', BUILDS.tovoice().args.includes('libopus') && BUILDS.tovoice().args.includes('voip'));
ok('tovoice output is ogg', BUILDS.tovoice().out === 'ogg');
ok('reverse uses areverse', BUILDS.reverse().args.join(' ').includes('areverse'));
ok('volume clamps absurd input', BUILDS.volume(['999']).args.join(' ').includes('volume=16'));
ok('volume clamps zero-ish input', BUILDS.volume(['0']).args.join(' ').includes('volume='), BUILDS.volume(['0']).args.join(' '));
ok('speed 4 chains two atempo filters', BUILDS.speed(['4']).args[1].split(',').length >= 2, BUILDS.speed(['4']).args[1]);
ok('speed 0.25 chains slow filters', BUILDS.speed(['0.25']).args[1].includes('atempo=0.5'));
ok('speed 1 is a single filter', BUILDS.speed(['1']).args[1] === 'atempo=1.000', BUILDS.speed(['1']).args[1]);
ok('trim computes duration from start+end', BUILDS.trim(['0:30', '1:15']).args.join(' ') === '-ss 30 -t 45 -acodec libmp3lame');
ok('trim without args throws a usage error', (() => { try { BUILDS.trim([]); return false; } catch { return true; } })());
ok('trim ignores reversed range', BUILDS.trim(['60', '30']).args.join(' ') === '-ss 60 -acodec libmp3lame');
ok('waveform renders one png frame', BUILDS.waveform().out === 'png' && BUILDS.waveform().args.includes('-frames:v'));
// WhatsApp plays "gifs" as silent looping mp4, so this must output mp4 — not raw GIF
ok('togif outputs mp4, not raw gif', BUILDS.gif().out === 'mp4');
ok('togif strips audio and uses h264', BUILDS.gif().args.includes('-an') && BUILDS.gif().args.includes('libx264'));
ok('togif sets faststart for streaming', BUILDS.gif().args.includes('+faststart'));

// ── time parsing ─────────────────────────────────────────────────────────
const times = { 65: 65, '1:05': 65, '1:02:03': 3723, '1m30s': 90, '90s': 90, '5m': 300, '2h': 7200 };
ok('parseTime handles every notation', Object.entries(times).every(([k, v]) => parseTime(k) === v),
  Object.entries(times).filter(([k, v]) => parseTime(k) !== v).map(([k]) => k).join(','));
ok('parseTime rejects junk', parseTime('abc') === null && parseTime('') === null);

// ── graceful degradation without ffmpeg ──────────────────────────────────
ok('ffmpeg is absent in this sandbox (as expected)', (await hasFfmpeg()) === false);
const registry = await loadPlugins('plugins');
const audioCmds = [...new Set(registry.values())].filter((p) => p.category === 'audio');
ok('9 conversions + 1 status command', audioCmds.length === 10, `got ${audioCmds.length}`);

const ctxFor = () => {
  let out = '';
  return [{
    args: [], argsText: '', command: 'x', prefix: '.', jid: 'g@g.us', key: {},
    msg: { key: {}, message: { audioMessage: { mimetype: 'audio/ogg' }, extendedTextMessage: { contextInfo: { quotedMessage: { audioMessage: {} } } } } },
    message: {}, config: { botName: 'NOVA-MD', ownerName: 'Owner' },
    sock: { sendMessage: async () => {}, downloadMediaMessage: async () => Buffer.alloc(64) },
    reply: async (c) => { out = c.text ?? '[media]'; },
  }, () => out];
};

let hinted = 0;
for (const plugin of audioCmds) {
  const [ctx, get] = ctxFor();
  await plugin.run(ctx);
  const out = get();
  if (/ffmpeg is not installed/i.test(out) && /apt install/i.test(out)) hinted++;
  else console.log(`   ${plugin.name} → ${out.slice(0, 90)}`);
}
ok('every audio command explains how to install ffmpeg', hinted === audioCmds.length, `${hinted}/${audioCmds.length}`);

// ── .take works without ffmpeg (webp RIFF surgery only) ──────────────────
const exif = buildStickerExif({ pack: 'NOVA Packs', author: 'Nova Devs' });
ok('exif starts with the WhatsApp TIFF header', exif.subarray(0, 4).toString('hex') === '49492a00' && exif.subarray(0, 22).equals(EXIF_HEADER));
const payload = JSON.parse(exif.subarray(22).toString('utf8'));
ok('exif carries pack name', payload['sticker-pack-name'] === 'NOVA Packs');
ok('exif carries publisher', payload['sticker-pack-publisher'] === 'Nova Devs');

const png = await sharp({ create: { width: 64, height: 48, channels: 4, background: { r: 20, g: 180, b: 90, alpha: 1 } } }).png().toBuffer();

for (const [label, webp] of [
  ['lossy', await sharp(png).webp().toBuffer()],
  ['lossless', await sharp(png).webp({ lossless: true }).toBuffer()],
]) {
  const stamped = stampWebpExif(webp, buildStickerExif({ pack: 'NOVA Packs', author: 'Nova Devs' }));
  const meta = await sharp(stamped).metadata();
  ok(`${label}: stamped webp still decodes`, meta.format === 'webp' && meta.width === 64 && meta.height === 48,
    `${meta.format} ${meta.width}x${meta.height}`);
  ok(`${label}: sharp sees the exif block`, !!meta.exif);
  ok(`${label}: riff length is consistent`, stamped.readUInt32LE(4) === stamped.length - 8);
  ok(`${label}: pack metadata round-trips`, readStickerExif(stamped)?.['sticker-pack-name'] === 'NOVA Packs');
  ok(`${label}: author round-trips`, readStickerExif(stamped)?.['sticker-pack-publisher'] === 'Nova Devs');
}

ok('sticker without exif returns null', readStickerExif(await sharp(png).webp().toBuffer()) === null);

console.log(`\naudio: ${pass}/${pass + fail} passed`);
if (fail) process.exitCode = 1;
