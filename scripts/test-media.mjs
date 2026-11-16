/**
 * Media batch tests. Local work runs on real fixture bytes (sharp + ffmpeg);
 * the music and upload commands are exercised against the live endpoints,
 * because a preview that only works in a mock is worthless.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { loadPlugins } from '../src/lib/loader.js';
import { JsonStore } from '../src/lib/store.js';

const run = promisify(execFile);
const registry = await loadPlugins('plugins');
const store = new JsonStore(':memory:');
store.data = {};
const config = { economy: { symbol: '₦', startBalance: 1000, dailyAmount: 2500 }, botName: 'NOVA-MD' };

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label} ${detail}`); }
};

// Resolve ffmpeg the way the bot does, then fall back to imageio's build so the
// suite works on a bare sandbox without a system ffmpeg on PATH.
async function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const { stdout } = await run('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { timeout: 20_000 });
    const found = stdout.trim();
    if (found) return found;
  } catch { /* no imageio */ }
  return 'ffmpeg';
}
const FFMPEG = await resolveFfmpeg();
process.env.FFMPEG_PATH = FFMPEG;
async function fixture(args, name) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nova-media-'));
  const out = path.join(dir, name);
  try {
    await run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args, out], { timeout: 40_000 });
    return await fs.readFile(out);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

const image = await sharp({ create: { width: 640, height: 420, channels: 3, background: '#25d366' } }).jpeg().toBuffer();
const video = await fixture(['-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=12:duration=1', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest'], 'v.mp4');
const audio = await fixture(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-acodec', 'libmp3lame', '-b:a', '96k'], 'a.mp3');

function mediaMsg(kind, extra = {}) {
  const content = { imageMessage: { mimetype: 'image/jpeg' }, videoMessage: { mimetype: 'video/mp4' }, audioMessage: { mimetype: 'audio/mpeg' } }[kind];
  return { key: { remoteJid: '2348000020@s.whatsapp.net', id: 'X1' }, message: { [kind === 'imageMessage' ? 'imageMessage' : kind]: { ...content, ...extra } } };
}

async function call(name, { argsText = '', msg = { key: {}, message: { conversation: 'x' } }, buffer = null } = {}) {
  let out = null;
  const plugin = registry.get(name);
  if (!plugin) throw new Error(`no plugin ${name}`);
  const sock = {
    sendMessage: async () => {},
    downloadMediaMessage: async () => buffer,
  };
  await plugin.run({
    argsText, args: String(argsText).split(' ').filter(Boolean), prefix: '.', command: name,
    store, config, senderJid: '2348000020@s.whatsapp.net', jid: '2348000020@s.whatsapp.net',
    pushName: 'Tester', msg, message: msg.message, reply: async (c) => { out = c; },
    sock, react: async () => {},
  });
  return out || { text: '(no reply)' };
}
const brief = (c) => (c.text || c.caption || '').replace(/\n/g, ' | ').slice(0, 90);

/* ── image work ───────────────────────────────────────────────────── */
const rotated = await call('rotate', { argsText: '45', msg: mediaMsg('imageMessage'), buffer: image });
const rotMeta = rotated.image ? await sharp(rotated.image).metadata() : {};
ok('rotate turns the photo and returns an image', Boolean(rotated.image) && rotMeta.width > 0, brief(rotated));
ok('rotate rejects an absurd angle', /between/.test((await call('rotate', { argsText: '900', msg: mediaMsg('imageMessage'), buffer: image })).text || ''));

const marked = await call('watermark', { argsText: 'NOVA-MD', msg: mediaMsg('imageMessage'), buffer: image });
ok('watermark returns a stamped image', Boolean(marked.image) && /NOVA-MD/.test(marked.caption || ''), brief(marked));
ok('watermark needs text', /Usage/.test((await call('watermark', { msg: mediaMsg('imageMessage'), buffer: image })).text || ''));

const meme = await call('meme', { argsText: 'when it works | when it does not', msg: mediaMsg('imageMessage'), buffer: image });
const memeMeta = meme.image ? await sharp(meme.image).metadata() : {};
ok('meme burns both caption bands in', Boolean(meme.image) && memeMeta.height === 420, brief(meme));
ok('meme asks for text when given none', /Usage/.test((await call('meme', { msg: mediaMsg('imageMessage'), buffer: image })).text || ''));

/* ── video + audio work ───────────────────────────────────────────── */
const mp4 = await call('tomp4', { msg: mediaMsg('videoMessage'), buffer: video });
ok('tomp4 returns a playable mp4', mp4.video?.length > 1000 && mp4.mimetype === 'video/mp4', brief(mp4));
ok('tomp4 insists on a video', /needs/.test((await call('tomp4', { msg: mediaMsg('imageMessage'), buffer: image })).text || ''));

const vn = await call('tovn', { msg: mediaMsg('audioMessage'), buffer: audio });
ok('tovn produces a voice note (ptt)', vn.audio?.length > 500 && vn.ptt === true && /opus/.test(vn.mimetype), brief(vn));

const cut = await call('trim-audio', { argsText: '0 1', msg: mediaMsg('audioMessage'), buffer: audio });
ok('trim-audio cuts and returns audio', cut.audio?.length > 500 && cut.mimetype === 'audio/mpeg', brief(cut));

/* ── links ────────────────────────────────────────────────────────── */
const pasted = await call('paste', { argsText: 'nova md paste test' });
const pasteUrl = (pasted.text || '').match(/https:\/\/paste\.rs\/\S+/)?.[0];
ok('paste returns a live paste.rs link', Boolean(pasteUrl), brief(pasted));
if (pasteUrl) {
  const fetched = await fetch(pasteUrl).then((r) => r.text()).catch(() => '');
  ok('the pasted URL really contains the text', /nova md paste test/.test(fetched), fetched.slice(0, 60));
}

const uploaded = await call('tourl', { argsText: 'novalink 123', msg: { key: {}, message: { conversation: 'x' } } });
const upUrl = (uploaded.text || '').match(/https:\/\/\S+/)?.[0];
ok('tourl of text returns a link', Boolean(upUrl), brief(uploaded));

if (video?.length) {
  const mediaUpload = await call('tourl', { msg: mediaMsg('videoMessage'), buffer: video });
  const fileUrl = (mediaUpload.text || '').match(/https:\/\/tmpfiles\.org\/dl\/\S+/)?.[0];
  ok('tourl uploads a real file and gives a direct link', Boolean(fileUrl), brief(mediaUpload));
}

/* ── music ────────────────────────────────────────────────────────── */
const dz = await call('deezer', { argsText: 'burna boy last last' });
ok('deezer sends real preview audio', dz.audio?.length > 50_000 && /audio\/mpeg/.test(dz.mimetype || ''), brief(dz));
ok('deezer caption names artist and track', /Burna Boy/i.test(dz.caption || '') && /ᴛɪᴛʟᴇ|title/i.test(dz.caption || ''), brief(dz));

const dzList = await call('deezerlist', { argsText: 'wizkid' });
ok('deezerlist lists matches', (dzList.text.match(/┣◆/g) || []).length >= 3, brief(dzList));

const apple = await call('applemusic', { argsText: 'asake loneliness' });
ok('applemusic sends preview audio', (apple.audio?.length || 0) > 50_000, brief(apple));

const spotify = await call('spotifysearch', { argsText: 'https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b' });
ok('spotify gives metadata for a real track link', /Blinding Lights/.test(spotify.caption || spotify.text || ''), brief(spotify));
ok('spotify is honest that audio is not included', /not public/i.test(spotify.caption || '') && Boolean(spotify.image), brief(spotify));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
