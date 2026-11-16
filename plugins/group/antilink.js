const LINK_RE = /(chat\.whatsapp\.com\/|https?:\/\/|www\.)/i;

export default {
  name: 'antilink',
  category: 'group',
  description: 'Delete links posted by non-admins (on | off)',
  usage: '.antilink on|off | status',
  groupOnly: true,
  adminOnly: true,
  botAdminNeeded: true,

  async run({ args, reply, store, jid }) {
    const state = store.get(jid, 'antilink', false);
    const arg = (args[0] || '').toLowerCase();

    if (arg === 'on' || arg === 'off') {
      store.set(jid, { antilink: arg === 'on' });
      return reply({ text: arg === 'on' ? '🔗 Antilink *enabled*.' : '🔗 Antilink *disabled*.' });
    }
    return reply({ text: `🔗 Antilink is currently *${state ? 'on' : 'off'}*.\nUse .antilink on | off` });
  },

  // Runs on every non-command message — this is how you build passive guards
  async onMessage(ctx, plugin) {
    const { store, jid, isGroup, isAdmin, isBotAdmin, sender, text, msg, sock } = ctx;
    if (!isGroup || isAdmin || !isBotAdmin) return;
    if (!store.get(jid, 'antilink', false)) return;
    if (!LINK_RE.test(text || '')) return;

    await sock.sendMessage(jid, { delete: { remoteJid: jid, fromMe: false, id: msg.key.id, participant: msg.key.participant } }).catch(() => {});
    await sock.sendMessage(jid, {
      text: `🚫 Links are not allowed here, @${sender}.`,
      mentions: [msg.key.participant || jid],
    }).catch(() => {});
  },
};
