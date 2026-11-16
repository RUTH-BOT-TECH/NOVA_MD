import { row } from '../../src/lib/ui.js';

const KEY = 'goodbye';

export default {
  name: 'goodbye',
  aliases: ['setgoodbye'],
  category: 'group',
  description: 'Announce members leaving — on | off | set <text>',
  usage: '.goodbye on | .goodbye set Bye {user}',
  groupOnly: true,
  adminOnly: true,
  async run({ args, argsText, reply, store, jid, command }) {
    const sub = (args[0] || '').toLowerCase();
    const enabled = store.get(jid, `${KEY}Enabled`, false);
    const template = store.get(jid, `${KEY}Text`, '');

    if (sub === 'on' || sub === 'off') {
      store.set(jid, { [`${KEY}Enabled`]: sub === 'on' });
      return reply({ text: `👋 Goodbye messages *${sub === 'on' ? 'enabled' : 'disabled'}*.` });
    }
    if (sub === 'set' || command === 'setgoodbye') {
      const text = command === 'setgoodbye' ? String(argsText || '').trim() : argsText.slice(3).trim();
      if (!text) return reply({ text: 'Usage: .goodbye set Bye {user}, {count} members left.' });
      store.set(jid, { [`${KEY}Text`]: text, [`${KEY}Enabled`]: true });
      return reply({ text: `✅ Goodbye template saved and enabled:\n\n_${text}_` });
    }

    await reply({
      text: [
        '┏❐ 《 ɢᴏᴏᴅʙʏᴇ 》 ❐',
        row('status', enabled ? 'on' : 'off'),
        row('template', template || '(default)'),
        row('tokens', '{user} · {group} · {count}'),
        '┗❐',
        '',
        '.goodbye on | off | set <text>',
      ].join('\n'),
    });
  },
};
