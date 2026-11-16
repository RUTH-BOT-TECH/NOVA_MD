import { row, duration } from '../../src/lib/ui.js';
import { adminsOf } from '../../src/lib/group.js';

export default {
  name: 'groupinfo',
  aliases: ['ginfo', 'infogroup'],
  category: 'group',
  description: 'Group name, owner, size, settings',
  usage: '.groupinfo',
  groupOnly: true,
  async run({ reply, groupMetadata: g }) {
    if (!g) return reply({ text: '❌ Could not read group metadata.' });
    const admins = adminsOf(g);
    await reply({
      text: [
        '┏❐ 《 ɢʀᴏᴜᴘ ɪɴꜰᴏ 》 ❐',
        row('name', g.subject || '—'),
        row('id', g.id),
        row('owner', g.owner ? `@${String(g.owner).split('@')[0]}` : '—'),
        row('members', g.participants?.length || 0),
        row('admins', admins.length),
        row('created', g.creation ? new Date(g.creation * 1000).toISOString().slice(0, 10) : '—'),
        row('age', g.creation ? duration(Date.now() - g.creation * 1000) : '—'),
        row('announce', g.announce ? 'on (admins only)' : 'off'),
        row('locked', g.restrict ? 'on (admins edit info)' : 'off'),
        row('description', (g.desc || '—').slice(0, 220)),
        '┗❐',
      ].join('\n'),
      mentions: g.owner ? [g.owner] : [],
    });
  },
};
