import { commandList } from '../../src/lib/loader.js';
import { sc, bar, bytes, duration } from '../../src/lib/ui.js';
import { systemStats } from '../../src/lib/system.js';
import { contactMessage } from '../../src/lib/vcard.js';
import { bareJid } from '../../src/lib/message.js';

const ORDER = ['general', 'group', 'owner', 'tools', 'dev', 'search', 'text', 'textmaker', 'converter', 'image', 'media', 'audio', 'anime', 'fun', 'games', 'economy', 'download', 'ai', 'reactions', 'social', 'faith', 'misc'];
const BADGE = { ownerOnly: ' 👑', adminOnly: ' 🛡️', botAdminNeeded: '' };

function groupByCategory(registry) {
  const map = new Map();
  for (const p of commandList(registry)) {
    const cat = (p.category || 'misc').toLowerCase();
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(p);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99))
    .map(([cat, list]) => [cat, list.sort((x, y) => x.name.localeCompare(y.name))]);
}

async function measureSpeed({ sock, jid, runtime }) {
  if (runtime.lastLatency) return runtime.lastLatency;
  const t = Date.now();
  await sock.sendPresenceUpdate('available', jid).catch(() => {});
  const ms = Date.now() - t;
  runtime.lastLatency = ms;
  return ms;
}

function infoHeader({ config, runtime, sock, stats, speed }) {
  const name = config.displayName || sc(config.botName);
  const sessions = sock.user ? 1 : 0;
  const rows = [
    ['owner', config.ownerName],
    ['mode', config.mode],
    ['host', stats.host],
    ['speed', `${speed} ms`],
    ['prefix', `[${config.prefixes.join(' ')}]`],
    ['cores', stats.cores],
    ['uptime', duration(runtime.uptime())],
    ['version', `v${config.version}`],
    ['sessions', `${sessions}/1`],
    ['usage', `${stats.mem.rssText} of ${stats.mem.totalText}`],
    ['ram', `${bar(stats.mem.percent)} ${stats.mem.percent}%`],
  ];
  return [`┏❐  ◈ ${name} ◈`, ...rows.map(([k, v]) => `┃ ${sc(k)} : ${v}`), '┗❐'].join('\n');
}

function categoryBlock(cat, list) {
  const lines = list.map((p) => `${sc(p.name)}${BADGE[p.ownerOnly] || BADGE[p.adminOnly] || ''}`);
  return [`┏❐ 《 ${sc(cat)} 》 ❐`, ...lines.map((l) => `┣◆ ${l}`), '┗❐'].join('\n');
}

export default {
  name: 'menu',
  aliases: ['help', 'commands'],
  category: 'general',
  description: 'Bot info + every command grouped by category',
  usage: '.menu [category]',
  async run({ reply, config, runtime, registry, sock, jid, args, prefix }) {
    const requested = args[0]?.toLowerCase();
    const groups = groupByCategory(registry);
    const total = commandList(registry).length;

    // .menu <category> → just that block
    if (requested && requested !== 'all') {
      const hit = groups.find(([cat]) => cat === requested);
      if (!hit) {
        const cats = groups.map(([c]) => `${prefix}menu ${c}`).join(' · ');
        return reply({ text: `❓ No category *${requested}*.\n\n${cats}` });
      }
      const [cat, list] = hit;
      return reply({
        text: `${categoryBlock(cat, list)}\n\n_${list.length} command${list.length === 1 ? '' : 's'} in ${sc(cat)} · ${prefix}menu all_`,
      });
    }

    const stats = systemStats();
    const speed = await measureSpeed({ sock, jid, runtime });

    // branded contact card first — that lavender "Contact: NAME ✓" bubble
    if (config.brandCard && sock.user) {
      await sock
        .sendMessage(jid, contactMessage({
          name: `${config.botName} ${config.nameTick || ''}`.trim(),
          phone: bareJid(sock.user.id),
          org: config.ownerName,
          url: config.repoUrl,
        }))
        .catch(() => {});
      await reply({ text: `_loading menu…_ ♻️` });
    }

    const body = groups.map(([cat, list]) => categoryBlock(cat, list)).join('\n\n');
    const footer =
      `_${sc('commands')} : ${total} · ${sc('categories')} : ${groups.length}_\n` +
      `_ᴛʏᴘᴇ ${prefix}menu <ᴄᴀᴛᴇɢᴏʀʏ> ꜰᴏʀ ᴏɴᴇ ʙʟᴏᴄᴋ_\n` +
      `_${config.repoUrl}_`;

    await reply({ text: `${infoHeader({ config, runtime, sock, stats, speed })}\n\n${body}\n\n${footer}` });
  },
};
