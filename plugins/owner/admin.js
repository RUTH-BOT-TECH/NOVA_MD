import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { bareJid } from '../../src/lib/message.js';
import { fetchBuffer } from '../../src/lib/http.js';
import { row } from '../../src/lib/ui.js';

/** Owner-level controls. Everything here is runtime state unless it says otherwise. */
const admin = (def) => ({ category: 'owner', ownerOnly: true, cooldownMs: 1500, ...def });
const G = (store) => store.get('__global__');

export default [
  admin({
    name: 'prefix', description: 'Change command prefixes at runtime', usage: '.prefix . ! /',
    async run({ argsText, reply, config }) {
      const next = argsText.replace(/\s+/g, '').split('').filter((c) => !/[a-z0-9]/i.test(c));
      if (!next.length) return reply({ text: `Current prefixes: *${config.prefixes.join(' ')}*` });
      config.prefixes = [...new Set(next)];
      await reply({ text: `⚙️ Prefixes now: *${config.prefixes.join(' ')}*\n_runtime only — set PREFIXES in .env to persist._` });
    },
  }),

  admin({
    name: 'botname', aliases: ['rename'], description: 'Rename the bot at runtime', usage: '.botname <name>',
    async run({ argsText, reply, config }) {
      const name = argsText.trim().slice(0, 40);
      if (!name) return reply({ text: `Bot name: *${config.botName}*` });
      config.botName = name;
      await reply({ text: `🏷️ Name set to *${name}* _(.menu to see it)_.` });
    },
  }),

  admin({
    name: 'sudo', aliases: ['addowner'], description: 'Grant owner rights to a user', usage: '.sudo @user | 2348012345678',
    async run({ store, argsText, reply, msg }) {
      const target = targetOf(argsText, msg);
      if (!target) return reply({ text: 'Reply to someone, @mention them, or type a number.' });
      const owners = new Set(G(store).owners || []);
      if (owners.has(target)) return reply({ text: `*${target}* is already a sudo owner.` });
      owners.add(target);
      store.set('__global__', { owners: [...owners] });
      await reply({ text: `✅ *+${target}* added as sudo owner (${owners.size} total).` });
    },
  }),

  admin({
    name: 'unsudo', aliases: ['delowner'], description: 'Revoke owner rights', usage: '.unsudo @user | 2348012345678',
    async run({ store, argsText, reply, msg }) {
      const target = targetOf(argsText, msg);
      if (!target) return reply({ text: 'Reply to someone, @mention them, or type a number.' });
      const owners = (G(store).owners || []).filter((o) => o !== target);
      store.set('__global__', { owners });
      await reply({ text: `✅ *+${target}* removed (${owners.length} sudo owners left).` });
    },
  }),

  admin({
    name: 'blacklist', aliases: ['block'], description: 'Make the bot ignore a user', usage: '.blacklist @user',
    async run({ store, argsText, reply, msg }) {
      const target = targetOf(argsText, msg);
      if (!target) return reply({ text: 'Reply to someone, @mention them, or type a number.' });
      const list = new Set(G(store).blacklist || []);
      list.add(target);
      store.set('__global__', { blacklist: [...list] });
      await reply({ text: `🚫 *+${target}* can no longer use commands (${list.size} blocked).` });
    },
  }),

  admin({
    name: 'unblacklist', aliases: ['unblock'], description: 'Let a blocked user back in', usage: '.unblacklist @user',
    async run({ store, argsText, reply, msg }) {
      const target = targetOf(argsText, msg);
      if (!target) return reply({ text: 'Reply to someone, @mention them, or type a number.' });
      const list = (G(store).blacklist || []).filter((b) => b !== target);
      store.set('__global__', { blacklist: list });
      await reply({ text: `✅ *+${target}* unblocked.` });
    },
  }),

  admin({
    name: 'blocked', aliases: ['blacklisted'], description: 'Show the block list', usage: '.blocked',
    async run({ store, reply }) {
      const list = G(store).blacklist || [];
      await reply({ text: list.length ? `🚫 Blocked (${list.length}):\n${list.map((b) => `• +${b}`).join('\n')}` : '✅ Nobody is blocked.' });
    },
  }),

  admin({
    name: 'maintenance', aliases: ['maintain'], description: 'Only owners can use the bot while on', usage: '.maintenance on|off',
    async run({ store, argsText, reply }) {
      const on = /^(on|1|true|yes)$/i.test(argsText.trim());
      store.set('__global__', { maintenance: on });
      await reply({ text: on ? '🛠️ Maintenance mode ON — only owners get replies.' : '✅ Maintenance mode OFF — everyone can use the bot.' });
    },
  }),

  admin({
    name: 'autoread', description: 'Toggle blue ticks on incoming messages', usage: '.autoread on|off',
    async run({ argsText, reply, config }) {
      const v = /^(on|1|true|yes)$/i.test(argsText.trim());
      if (!argsText.trim()) return reply({ text: `autoRead = *${config.autoRead ? 'on' : 'off'}*` });
      config.autoRead = v;
      await reply({ text: `👀 Auto-read ${v ? 'ON' : 'OFF'} _(.env AUTO_READ to persist)_.` });
    },
  }),

  admin({
    name: 'autotyping', description: 'Show "typing…" before replies', usage: '.autotyping on|off',
    async run({ argsText, reply, config }) {
      const v = /^(on|1|true|yes)$/i.test(argsText.trim());
      if (!argsText.trim()) return reply({ text: `autoTyping = *${config.autoTyping ? 'on' : 'off'}*` });
      config.autoTyping = v;
      await reply({ text: `⌨️ Auto-typing ${v ? 'ON' : 'OFF'} _(.env AUTO_TYPING to persist)_.` });
    },
  }),

  admin({
    name: 'join', aliases: ['joingroup'], description: 'Join a group from an invite link', usage: '.join https://chat.whatsapp.com/...',
    async run({ sock, argsText, reply }) {
      const code = argsText.trim().split('/').pop();
      if (!code) return reply({ text: 'Usage: .join <invite link>' });
      const jid = await sock.groupAcceptInvite(code);
      await reply({ text: `✅ Joined ${jid}` });
    },
  }),

  admin({
    name: 'leave', aliases: ['exit'], description: 'Leave this group (or another)', usage: '.leave',
    groupOnly: true,
    async run({ sock, jid, reply }) {
      await reply({ text: '👋 Leaving this group…' });
      await sock.groupLeave(jid);
    },
  }),

  admin({
    name: 'setbotpic', aliases: ['botpic', 'setpic'], description: 'Set the bot profile photo from a replied image', usage: '.setbotpic (reply to an image)',
    async run({ sock, msg, reply, message }) {
      const img = message?.imageMessage;
      if (!img) return reply({ text: 'Reply to an image and run .setbotpic' });
      const buffer = await sock.downloadMediaMessage(msg);
      if (!buffer?.length) return reply({ text: '❌ Could not download that image.' });
      await sock.updateProfilePicture(sock.user.id, buffer);
      await reply({ text: '✅ Profile photo updated.' });
    },
  }),

  admin({
    name: 'cleartmp', aliases: ['purgetmp'], description: 'Delete leftover download temp folders', usage: '.cleartmp',
    async run({ reply }) {
      const dir = os.tmpdir();
      let removed = 0, freed = 0;
      for (const entry of await fs.readdir(dir).catch(() => [])) {
        if (!entry.startsWith('nova-')) continue;
        const full = path.join(dir, entry);
        const stat = await fs.stat(full).catch(() => null);
        if (!stat?.isDirectory()) continue;
        for (const f of await fs.readdir(full).catch(() => [])) {
          freed += (await fs.stat(path.join(full, f)).catch(() => ({ size: 0 }))).size;
        }
        await fs.rm(full, { recursive: true, force: true }).catch(() => {});
        removed++;
      }
      await reply({ text: removed ? `🧹 Removed ${removed} temp folder(s), freed ${(freed / 1048576).toFixed(1)} MB.` : '✅ Nothing to clean.' });
    },
  }),
];

/**
 * Reply target → @mention → plain number.
 * Always returns a BARE number: that is what the handler compares against.
 */
function targetOf(argsText, msg) {
  const ctxInfo = msg.message?.extendedTextMessage?.contextInfo
    || msg.message?.imageMessage?.contextInfo;
  const mentioned = ctxInfo?.mentionedJid?.[0] || ctxInfo?.participant;
  if (mentioned) return bareJid(mentioned);
  const digits = String(argsText || '').replace(/[^\d]/g, '');
  return digits.length >= 7 ? digits : null;
}
