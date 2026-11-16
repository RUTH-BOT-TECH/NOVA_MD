import { resolveTarget } from '../../src/lib/group.js';
import { bareJid } from '../../src/lib/message.js';
import { grabImage } from '../../src/lib/media-input.js';

const groupCmd = (name, description, usage, run, opts = {}) => ({
  name,
  category: 'group',
  description,
  usage,
  groupOnly: true,
  adminOnly: true,
  ...opts,
  run,
});

const MAX_WARNS = 3;

export default [
  groupCmd('setname', 'Rename the group', '.setname New name',
    async ({ argsText, sock, jid, reply }) => {
      if (!argsText) return reply({ text: 'Usage: .setname New group name' });
      await sock.groupUpdateSubject(jid, argsText.slice(0, 100));
      await reply({ text: `✏️ Group renamed to *${argsText.slice(0, 100)}*` });
    }),

  groupCmd('setdesc', 'Change the group description', '.setdesc text',
    async ({ argsText, sock, jid, reply }) => {
      await sock.groupUpdateDescription(jid, argsText || '');
      await reply({ text: '📝 Group description updated.' });
    }),

  groupCmd('setpp', 'Set the group icon (reply to an image)', 'reply to an image with .setpp',
    async ({ msg, sock, jid, reply }) => {
      const buffer = await grabImage(sock, msg);
      if (!buffer) return reply({ text: '↩️ Reply to an image with .setpp' });
      await sock.updateProfilePicture(jid, buffer);
      await reply({ text: '🖼️ Group icon updated.' });
    }, { botAdminNeeded: true }),

  groupCmd('hidetag', 'Mention everyone without listing names', '.hidetag message',
    async ({ argsText, sock, jid, reply, groupMetadata }) => {
      const mentions = (groupMetadata?.participants || []).map((p) => p.id);
      await sock.sendMessage(jid, {
        text: argsText || '📢',
        mentions,
      });
    }),

  groupCmd('tagadmins', 'Mention only the admins', '.tagadmins message',
    async ({ argsText, sock, jid, reply, groupMetadata }) => {
      const admins = (groupMetadata?.participants || [])
        .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
        .map((p) => p.id);
      if (!admins.length) return reply({ text: 'No admins found.' });
      await sock.sendMessage(jid, {
        text: `${argsText || '📢'}\n\n${admins.map((a) => `@${bareJid(a)}`).join(' ')}`,
        mentions: admins,
      });
    }),

  groupCmd('resetlink', 'Revoke the current invite link', '.resetlink',
    async ({ sock, jid, reply }) => {
      const code = await sock.groupRevokeInvite(jid);
      await reply({ text: `♻️ New invite link:\nhttps://chat.whatsapp.com/${code}` });
    }, { botAdminNeeded: true }),

  groupCmd('delmsg', 'Delete a message (reply to it)', 'reply with .delmsg',
    async ({ msg, sock, jid, reply }) => {
      const info = msg.message?.extendedTextMessage?.contextInfo;
      if (!info?.stanzaId) return reply({ text: '↩️ Reply to the message you want deleted.' });
      await sock.sendMessage(jid, {
        delete: { remoteJid: jid, fromMe: false, id: info.stanzaId, participant: info.participant },
      });
    }, { botAdminNeeded: true }),

  groupCmd('pinmsg', 'Pin a message (reply to it)', 'reply with .pinmsg',
    async ({ msg, sock, jid, reply }) => {
      const info = msg.message?.extendedTextMessage?.contextInfo;
      if (!info?.stanzaId) return reply({ text: '↩️ Reply to the message you want pinned.' });
      await sock.sendMessage(jid, {
        pin: { remoteJid: jid, fromMe: false, id: info.stanzaId, participant: info.participant },
        type: 1,
        time: 86400,
      });
      await reply({ text: '📌 Pinned for 24h.' });
    }),

  groupCmd('warn', 'Warn a member; 3 warnings = kick', '.warn @user [reason]',
    async ({ msg, argsText, reply, store, jid, sock, groupMetadata }) => {
      const target = resolveTarget(msg, argsText);
      if (!target) return reply({ text: '↩️ Mention or reply to the member you want to warn.' });
      const phone = bareJid(target);
      const warns = store.get(jid, 'warns', {});
      const entry = warns[phone] || { count: 0 };
      entry.count += 1;
      const reason = argsText.replace(/^\S+\s*/, '').trim();
      warns[phone] = { count: entry.count, reason, at: Date.now() };
      store.set(jid, { warns });

      if (entry.count >= MAX_WARNS) {
        const botIsAdmin = (groupMetadata?.participants || [])
          .some((p) => bareJid(p.id) === bareJid(sock.user?.id) && p.admin);
        if (botIsAdmin) {
          await sock.groupParticipantsUpdate(jid, [target], 'remove').catch(() => {});
          delete warns[phone];
          store.set(jid, { warns });
          return reply({ text: `⛔ @${phone} reached ${MAX_WARNS} warnings and was removed.`, mentions: [target] });
        }
        return reply({ text: `⚠️ @${phone} has ${entry.count} warnings (I need admin rights to remove).`, mentions: [target] });
      }
      await reply({
        text: `⚠️ *Warning ${entry.count}/${MAX_WARNS}* for @${phone}${reason ? `\n_reason: ${reason}_` : ''}`,
        mentions: [target],
      });
    }),

  {
    name: 'warnings',
    aliases: ['warns'],
    category: 'group',
    description: 'Show warning counts in this group',
    usage: '.warnings',
    groupOnly: true,
    async run({ reply, store, jid }) {
      const warns = store.get(jid, 'warns', {});
      const entries = Object.entries(warns);
      if (!entries.length) return reply({ text: '✅ Nobody has warnings here.' });
      const lines = entries.map(([phone, w], i) => `${i + 1}. @${phone} — ${w.count}/${MAX_WARNS}${w.reason ? ` (${w.reason})` : ''}`);
      await reply({
        text: lines.join('\n'),
        mentions: entries.map(([phone]) => `${phone}@s.whatsapp.net`),
      });
    },
  },

  groupCmd('resetwarn', 'Clear warnings for a member (or all)', '.resetwarn @user | .resetwarn all',
    async ({ msg, args, argsText, reply, store, jid }) => {
      if ((args[0] || '').toLowerCase() === 'all') {
        store.set(jid, { warns: {} });
        return reply({ text: '♻️ All warnings cleared.' });
      }
      const target = resolveTarget(msg, argsText);
      if (!target) return reply({ text: '↩️ Mention or reply to the member.' });
      const warns = store.get(jid, 'warns', {});
      delete warns[bareJid(target)];
      store.set(jid, { warns });
      await reply({ text: `✅ Warnings cleared for @${bareJid(target)}`, mentions: [target] });
    }),
];
