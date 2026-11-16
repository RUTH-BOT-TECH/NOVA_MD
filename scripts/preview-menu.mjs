/**
 * Renders .menu to docs/menu-preview.txt so the README can show the real output
 * without needing a WhatsApp account.  Run: npm run preview
 */
import fs from 'node:fs/promises';
import { loadPlugins } from '../src/lib/loader.js';
import { handleIncoming } from '../src/handler.js';
import { config } from '../src/config.js';
import { store } from '../src/lib/store.js';

process.env.RAILWAY_ENVIRONMENT ||= 'preview'; // so the host row reads "Railway"

const registry = await loadPlugins(new URL('../plugins/', import.meta.url).pathname);
const sent = [];
const sock = {
  user: { id: '2348012345678:1@s.whatsapp.net' },
  sendMessage: async (jid, content) => { sent.push(content); return { key: { id: 'p' } }; },
  sendPresenceUpdate: async () => {},
  groupMetadata: async () => ({ participants: [] }),
};
const runtime = {
  startedAt: Date.now(),
  uptime: () => (14 * 3600 + 39 * 60 + 34) * 1000,
  lastLatency: 464,
};

await handleIncoming({
  sock,
  msg: {
    key: { remoteJid: '2348012345678@s.whatsapp.net', fromMe: false, id: 'preview' },
    message: { conversation: '.menu' },
    pushName: 'Preview',
  },
  registry, cfg: config, logger: { info() {}, warn() {}, error() {} }, store, runtime,
});

const text = sent.map((c) => c.text).join('\n\n');
await fs.writeFile(new URL('../docs/menu-preview.txt', import.meta.url), text + '\n', 'utf8');
console.log(text);
