/**
 * Live network test: actually calls the APIs the search/misc commands use.
 * Run manually (`npm run test:live`) — it needs internet, unlike `npm test`.
 */
import { loadPlugins } from '../src/lib/loader.js';
import { store } from '../src/lib/store.js';

const registry = await loadPlugins('plugins');
const cases = [
  ['wiki', 'Lagos'], ['npm', 'baileys'], ['github', 'baileys'], ['define', 'serendipity'],
  ['book', 'things fall apart'], ['tv', 'breaking bad'], ['news', 'lagos'],
  ['crypto', 'bitcoin'], ['currency', '100 USD NGN'], ['ip', '8.8.8.8'],
  ['lyrics', 'Coldplay - Yellow'], ['short', 'https://example.com/a/very/long/path?x=1'],
  ['translate', 'fr hello world'], ['note', 'add remember the milk'], ['note', 'list'],
  ['weather', 'Lagos'],
];

let pass = 0;
for (const [name, argsText] of cases) {
  const plugin = registry.get(name);
  if (!plugin) { console.log(`✗ ${name} — not registered`); continue; }
  let out = null;
  const ctx = {
    argsText, args: argsText.split(' '), prefix: '.', command: name, jid: 'test@s.whatsapp.net',
    store, config: { botName: 'NOVA-MD' }, message: {}, msg: { key: {} },
    reply: async (content) => { out = content?.text ?? '[media]'; },
    react: async () => {},
  };
  const t0 = Date.now();
  try {
    await plugin.run(ctx);
    const first = String(out || '').split('\n').filter(Boolean)[0] || '(empty)';
    console.log(`✓ ${name.padEnd(10)} ${String(Date.now() - t0).padStart(5)}ms  ${first.slice(0, 96)}`);
    pass++;
  } catch (err) {
    console.log(`✗ ${name.padEnd(10)} ${String(Date.now() - t0).padStart(5)}ms  ${err.message.slice(0, 110)}`);
  }
}
console.log(`\npassed ${pass}/${cases.length}`);
