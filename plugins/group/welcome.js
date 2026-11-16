import { row } from '../../src/lib/ui.js';

const KEY = 'welcome';

export default {
  name: 'welcome',
  aliases: ['setwelcome'],
  category: 'group',
  description: 'Greet new members — on | off | set <text>',
  usage: '.welcome on | .welcome set Hello {user}, welcome to {group}!',
  groupOnly: true,
  adminOnly: true,
  async run({ args, argsText, reply, store, jid, command }) {
    const sub = (args[0] || '').toLowerCase();
    const enabled = store.get(jid, `${KEY}Enabled`, false);
    const template = store.get(jid, `${KEY}Text`, '');

    if (sub === 'on' || sub === 'off') {
      store.set(jid, { [`${KEY}Enabled`]: sub === 'on' });
      return reply({ text: `👋 Welcome messages *${sub === 'on' ? 'enabled' : 'disabled'}*.` });
    }
    if (sub === 'set' || command === 'setwelcome') {
      const text = command === 'setwelcome' ? String(argsText || '').trim() : argsText.slice(3).trim();
      if (!text) return reply({ text: 'Usage: .welcome set Hello {user}, welcome to {group}! (#{count} members)' });
      store.set(jid, { [`${KEY}Text`]: text, [`${KEY}Enabled`]: true });
      return reply({ text: `✅ Welcome template saved and enabled:\n\n_${text}_` });
    }
    if (sub === 'reset') {
      store.set(jid, { [`${KEY}Text`]: '' });
      return reply({ text: '♻️ Back to the default welcome text.' });
    }

    await reply({
      text: [
        '┏❐ 《 ᴡᴇʟᴄᴏᴍᴇ 》 ❐',
        row('status', enabled ? 'on' : 'off'),
        row('template', template || '(default)'),
        row('tokens', '{user} · {group} · {count}'),
        '┗❐',
        '',
        '.welcome on | off | set <text> | reset',
      ].join('\n'),
    });
  },
};
