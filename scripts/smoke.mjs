/**
 * Offline smoke test: loads every plugin, then feeds fake messages through the
 * real handler with a stub socket — no WhatsApp connection needed.
 * Run: npm run smoke
 */
import { loadPlugins, commandList } from '../src/lib/loader.js';
import { handleIncoming } from '../src/handler.js';
import { config } from '../src/config.js';
import { store } from '../src/lib/store.js';

const PLUGIN_DIR = new URL('../plugins/', import.meta.url).pathname;
const BOT = '2348000000000:1@s.whatsapp.net';
const USER = '2348111111111@s.whatsapp.net';

const sent = [];
const sock = {
  user: { id: BOT, name: config.botName },
  sendMessage: async (jid, content, options) => { sent.push({ jid, content, options }); return { key: { id: 'x' } }; },
  sendPresenceUpdate: async () => {},
  readMessages: async () => {},
  groupMetadata: async () => ({
    participants: [
      { id: USER, admin: null },
      { id: BOT, admin: 'admin' },
      { id: '2348222222222@s.whatsapp.net', admin: 'superadmin' },
    ],
  }),
  groupParticipantsUpdate: async () => [],
  groupSettingUpdate: async () => {},
  groupFetchAllParticipating: async () => ({}),
};

const runtime = { startedAt: Date.now(), uptime: () => 61000, commands: [] };
const registry = await loadPlugins(PLUGIN_DIR);
runtime.commands = commandList(registry);
runtime.reload = async () => commandList(registry).length;

console.log(`\nplugins loaded: ${commandList(registry).length} (${[...registry.keys()].length} names incl. aliases)`);
console.log('commands:', [...registry.keys()].join(' '));

const ADMIN = '2348222222222@s.whatsapp.net';

async function fake(text, { group = false, participant } = {}) {
  const jid = group ? '120363000000000000@g.us' : USER;
  const msg = {
    key: { remoteJid: jid, fromMe: false, id: `T${Math.random().toString(36).slice(2)}`, participant: group ? (participant || USER) : undefined },
    message: { conversation: text },
    pushName: 'Tester',
    messageTimestamp: Math.floor(Date.now() / 1000),
  };
  sent.length = 0;
  await handleIncoming({ sock, msg, registry, cfg: config, logger: console, store, runtime });
  return sent.map((s) => s.content.text || `<${Object.keys(s.content).join(',')}>`);
}

for (const cmd of ['.ping', '.alive', '.repo', '.menu', '.antilink status', '.tagall hello all', '.kick @2348111111111']) {
  const isGroupCmd = ['antilink', 'tagall', 'kick'].some((c) => cmd.startsWith(`.${c}`));
  const out = await fake(cmd, { group: isGroupCmd, participant: ADMIN });
  console.log(`\n${cmd} →`, out.length ? `\n${out.join('\n---\n').slice(0, 600)}` : '(no reply — blocked by a guard or ignored)');
}

// unknown command should be silent
console.log('\n.nonexistent →', (await fake('.nonexistent')).length ? 'REPLIED (unexpected)' : 'silent ✅');
