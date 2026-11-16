import sharp from 'sharp';

/**
 * A stand-in for a live Baileys socket.
 *
 * It implements the same methods the bot actually calls and records every
 * outgoing payload, so the full handler → guard → plugin → socket path can be
 * exercised without a WhatsApp connection. Media "downloads" return real,
 * valid fixture bytes so downstream sharp/ffmpeg/webp work is genuine.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);

/** Real media when ffmpeg exists (so conversions are genuine), synthetic otherwise. */
async function ffmpegFixture(args, outName) {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nova-fix-'));
  const out = path.join(dir, outName);
  try {
    await run(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args, out], { timeout: 30_000 });
    return await fs.readFile(out);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function makeFixtures() {
  const image = await sharp({
    create: { width: 640, height: 480, channels: 3, background: { r: 24, g: 160, b: 90 } },
  }).jpeg({ quality: 82 }).toBuffer();

  const stickerSource = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { r: 24, g: 160, b: 90, alpha: 1 } },
  }).png().toBuffer();
  const sticker = await sharp(stickerSource).webp({ quality: 70 }).toBuffer();

  // prefer genuinely encoded media so ffmpeg conversions can be verified
  let audio = null;
  let video = null;
  try {
    audio = await ffmpegFixture(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-acodec', 'libopus', '-b:a', '24k'], 'a.ogg');
  } catch { /* no ffmpeg: fall back below */ }
  if (!audio) {
    audio = Buffer.concat([Buffer.from('4f676753000200000000000000006a1e', 'hex'), Buffer.alloc(2048, 0x11)]);
  }
  try {
    video = await ffmpegFixture([
      '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=12:duration=1',
      '-f', 'lavfi', '-i', 'sine=frequency=330:duration=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest',
    ], 'v.mp4');
  } catch { /* fall back */ }
  if (!video) video = Buffer.concat([Buffer.from('00000018667479706d703432', 'hex'), Buffer.alloc(4096, 0x22)]);

  return {
    image,
    sticker,
    audio,
    video,
    document: Buffer.from('%PDF-1.4\n% NOVA-MD test fixture\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'),
    pdf: Buffer.from('%PDF-1.4\n% NOVA-MD test fixture\n%%EOF'),
  };
}

export const GROUP_JID = '120363000000000001@g.us';

export function groupMetadata(extra = {}) {
  return {
    id: GROUP_JID,
    subject: 'NOVA Test Group',
    owner: '2348000000001@s.whatsapp.net',
    size: 3,
    participants: [
      { id: '2348000000001@s.whatsapp.net', admin: 'admin' },
      { id: '2348000000002@s.whatsapp.net', admin: null },
      { id: '2348000000000@s.whatsapp.net', admin: 'admin' }, // the bot itself
    ],
    ...extra,
  };
}

let cachedFixtures = null;
export const fixturesOnce = async () => (cachedFixtures ||= await makeFixtures());

export async function makeSocket() {
  const sent = [];
  const calls = [];
  const fixtures = await fixturesOnce();

  const record = (kind, extra = {}) => { calls.push({ kind, ...extra }); };

  const socket = {
    user: { id: '2348000000000@s.whatsapp.net', name: 'NOVA-MD', lid: '2348000000000@lid' },
    sent,
    calls,
    fixtures,
    ev: { on() {}, off() {}, removeAllListeners() {}, process() {} },

    async sendMessage(jid, content, options = {}) {
      sent.push({ jid, content, options });
      return { key: { id: `SENT${sent.length}`, remoteJid: jid, fromMe: true } };
    },

    async readMessages(keys) { record('readMessages', { keys }); return []; },
    async sendPresenceUpdate(type, jid) { record('presence', { type, jid }); },
    async sendReadReceipt(jid, participant) { record('readReceipt', { jid, participant }); },

    // media
    async downloadMediaMessage(message) {
      const type = Object.keys(message?.message || {}).find((k) => /Message$/.test(k));
      const buf = { imageMessage: fixtures.image, stickerMessage: fixtures.sticker, audioMessage: fixtures.audio, videoMessage: fixtures.video, documentMessage: fixtures.document }[type];
      if (!buf) throw new Error(`no fixture for ${type}`);
      record('downloadMediaMessage', { type, bytes: buf.length });
      return buf;
    },
    async updateMediaMessage(msg) { return msg; },

    // groups
    async groupMetadata(jid) { record('groupMetadata', { jid }); return groupMetadata(); },
    async groupFetchAllParticipating() { return { [GROUP_JID]: groupMetadata() }; },
    async groupParticipantsUpdate(jid, participants, action) { record('groupParticipantsUpdate', { jid, participants, action }); return participants.map((p) => ({ status: '200', jid: p })); },
    async groupUpdateSubject(jid, subject) { record('groupUpdateSubject', { jid, subject }); },
    async groupUpdateDescription(jid, description) { record('groupUpdateDescription', { jid, description }); },
    async groupSettingUpdate(jid, setting) { record('groupSettingUpdate', { jid, setting }); },
    async groupLeave(jid) { record('groupLeave', { jid }); },
    async groupAcceptInvite(code) { record('groupAcceptInvite', { code }); return GROUP_JID; },
    async groupInviteCode(jid) { record('groupInviteCode', { jid }); return 'INVITECODE123'; },
    async groupRevokeInvite(jid) { record('groupRevokeInvite', { jid }); return 'NEWCODE456'; },
    async groupCreate(subject, participants) { record('groupCreate', { subject, participants }); return { id: GROUP_JID, subject, participants: [] }; },
    async groupGetInviteInfo(code) { record('groupGetInviteInfo', { code }); return groupMetadata({ id: GROUP_JID + ':inv' }); },

    // profile
    async updateProfilePicture(jid, img) { record('updateProfilePicture', { jid, bytes: img?.length }); },
    async updateProfileStatus(status) { record('updateProfileStatus', { status }); },
    async profilePictureUrl(jid, type = 'image') { record('profilePictureUrl', { jid, type }); return 'https://example.invalid/avatar.jpg'; },
    async fetchStatus(jid) { record('fetchStatus', { jid }); return []; },
    async onWhatsApp(numbers) { record('onWhatsApp', { numbers }); return numbers.map((n) => ({ jid: `${n}@s.whatsapp.net`, exists: true })); },

    // presence / misc
    async sendPresence() {},
    async logout() { record('logout'); },
    end() { record('end'); },
    ws: { close() {}, isOpen: true },
  };
  return socket;
}

/** Build an incoming message the way Baileys delivers it. */
export function incoming({ text, jid = '2348000000001@s.whatsapp.net', sender = '2348000000001', quoted = null, group = false, fromMe = false }) {
  const message = quoted
    ? { extendedTextMessage: { text, contextInfo: { stanzaId: 'QUOTED1', participant: `${sender}@s.whatsapp.net`, quotedMessage: quoted } } }
    : { conversation: text };
  return {
    key: {
      remoteJid: group ? GROUP_JID : jid,
      fromMe,
      id: `IN${Math.random().toString(36).slice(2, 10)}`,
      participant: group ? `${sender}@s.whatsapp.net` : undefined,
    },
    message,
    pushName: 'Tester',
    messageTimestamp: Math.floor(Date.now() / 1000),
  };
}
