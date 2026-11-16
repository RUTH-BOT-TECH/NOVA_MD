import {
  getText, unwrapMessage, bareJid, isGroupJid, isStatusJid, isNewsletterJid,
} from './lib/message.js';
import { getGroupMetadata, isParticipantAdmin, isBotAdmin } from './lib/group.js';
import { config as defaultConfig, isOwnerJid } from './config.js';

const cooldowns = new Map(); // sender -> timestamp

function parseCommand(text, prefixes) {
  if (!text) return null;
  const prefix = prefixes.find((p) => text.startsWith(p));
  if (!prefix) return null;
  const body = text.slice(prefix.length).trim();
  if (!body) return null;
  const [rawName, ...rest] = body.split(/\s+/);
  return {
    prefix,
    command: rawName.toLowerCase(),
    args: rest,
    argsText: body.slice(rawName.length).trim(),
  };
}

/**
 * Turns one Baileys message into a context object, runs guards,
 * then dispatches to the matching plugin.
 */
export async function handleIncoming({ sock, msg, registry, cfg = defaultConfig, logger, store, runtime }) {
  const jid = msg.key?.remoteJid;
  if (!jid || isStatusJid(jid) || isNewsletterJid(jid)) return;

  const message = unwrapMessage(msg.message);
  if (!message) return;

  const isGroup = isGroupJid(jid);
  const senderJid = isGroup ? msg.key.participant || jid : jid;
  const sender = bareJid(senderJid);
  // dynamic owner list + blacklist live in the store so they survive restarts
  const globals = store?.get('__global__') || {};
  const dynamicOwners = globals.owners || [];
  const isBlacklisted = (globals.blacklist || []).includes(sender);
  const isOwner = isOwnerJid(senderJid) || dynamicOwners.includes(sender) || !!msg.key.fromMe;

  // .banuser / .banchat write here; the owner always gets through
  const bannedUser = (globals.bannedUsers || []).includes(sender);
  const bannedChat = (globals.bannedChats || []).includes(jid);
  if ((isBlacklisted || bannedUser || bannedChat) && !isOwner) return;
  const text = getText(msg.message).trim();

  const groupMetadata = isGroup
    ? await getGroupMetadata(sock, jid).catch(() => null)
    : null;

  const ctx = {
    sock,
    msg,
    key: msg.key,
    message,
    jid,
    isGroup,
    isOwner,
    sender,
    senderJid,
    pushName: msg.pushName || '',
    text,
    isAdmin: isGroup ? isParticipantAdmin(groupMetadata, senderJid) : false,
    isBotAdmin: isGroup ? isBotAdmin(sock, groupMetadata) : false,
    groupMetadata,
    config: cfg,
    logger,
    store,
    runtime,
    registry,
    reply: (content, options = {}) => sock.sendMessage(jid, content, { quoted: msg, ...options }),
    react: (emoji) => sock.sendMessage(jid, { react: { text: emoji, key: msg.key } }),
  };

  // a prefix saved by .setprefix wins over the .env default
  const prefixes = globals.prefix ? [globals.prefix] : cfg.prefixes;
  const parsed = parseCommand(text, prefixes);

  // Non-command traffic → give plugins a chance to react (antilink, AI chat, logs…)
  if (!parsed) {
    for (const plugin of new Set(registry.values())) {
      if (!plugin.onMessage) continue;
      try {
        await plugin.onMessage(ctx, plugin);
      } catch (err) {
        logger?.error({ err, plugin: plugin.name }, 'onMessage hook failed');
      }
    }
    return;
  }

  const plugin = registry.get(parsed.command);
  if (!plugin) {
    for (const p of new Set(registry.values())) {
      if (!p.onMessage) continue;
      try {
        await p.onMessage(ctx, p, { unknownCommand: parsed.command });
      } catch { /* hooks are best-effort */ }
    }
    return;
  }

  // ── guards ─────────────────────────────────────────────────────────────
  if (cfg.mode === 'self' && !isOwner) return;

  if (globals.maintenance && !isOwner) {
    return ctx.reply({ text: '🛠️ Maintenance in progress — try again shortly.' });
  }

  if (plugin.ownerOnly && !isOwner) {
    return ctx.reply({ text: '⛔ This command is for the bot owner only.' });
  }
  if (plugin.groupOnly && !isGroup) {
    return ctx.reply({ text: '⛔ This command only works inside a group.' });
  }
  if (plugin.privateOnly && isGroup) {
    return ctx.reply({ text: '⛔ This command only works in my DMs.' });
  }
  if (plugin.adminOnly && !isOwner && !ctx.isAdmin) {
    return ctx.reply({ text: '⛔ Group admins only.' });
  }
  if (plugin.botAdminNeeded && !ctx.isBotAdmin) {
    return ctx.reply({ text: '⛔ Make me a group admin first.' });
  }

  const cd = Number(plugin.cooldownMs ?? cfg.cooldownMs) || 0;
  if (cd > 0) {
    const cdKey = `${sender}:${parsed.command}`;
    const last = cooldowns.get(cdKey) || 0;
    if (Date.now() - last < cd) return;
    cooldowns.set(cdKey, Date.now());
  }

  // ── execute ────────────────────────────────────────────────────────────
  const started = Date.now();
  try {
    if (cfg.autoRead) await sock.readMessages([msg.key]).catch(() => {});
    if (cfg.autoTyping && isGroup) await sock.sendPresenceUpdate('composing', jid).catch(() => {});

    await plugin.run({ ...ctx, command: parsed.command, prefix: parsed.prefix, args: parsed.args, argsText: parsed.argsText });

    if (cfg.autoTyping) await sock.sendPresenceUpdate('paused', jid).catch(() => {});
    logger?.info(`✔ ${parsed.prefix}${parsed.command} from ${sender}${isGroup ? ` in ${jid}` : ''} (${Date.now() - started}ms)`);
  } catch (err) {
    logger?.error({ err, command: parsed.command }, 'command threw');
    const detail = process.env.NODE_ENV === 'production' ? '' : `\n\n\`${err.message}\``;
    await ctx.reply({ text: `⚠️ *${parsed.prefix}${parsed.command}* failed.${detail}` }).catch(() => {});
  }
}
