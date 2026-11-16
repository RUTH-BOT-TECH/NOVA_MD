export default {
  name: 'repo',
  aliases: ['source', 'script'],
  category: 'general',
  description: 'Show this bot\'s name, version and source link',
  usage: '.repo',
  async run({ reply, config }) {
    // Everything here comes from your .env — no borrowed stats, no copied banners.
    await reply({
      text:
        `╭─「 *BOT INFO* 」\n` +
        `│ *Name* : ${config.botName}\n` +
        `│ *Version* : v${config.version}\n` +
        `│ *Owner* : ${config.ownerName}\n` +
        `│ *Prefix* : ${config.prefixes.join(' ')}\n` +
        `│ *Mode* : ${config.mode}\n` +
        `│ *Runtime* : Node ${process.version}\n` +
        `│ *Engine* : Baileys (multi-device)\n` +
        `╰────────────\n\n` +
        `*Repo:* ${config.repoUrl}\n\n` +
        `_Fork it, rename it, make it yours._`,
    });
  },
};
