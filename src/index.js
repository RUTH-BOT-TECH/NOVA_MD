import http from 'node:http';
import {
  makeWASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  delay,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';

import { config } from './config.js';
import { logger, baileysLogger } from './lib/logger.js';
import { useAuthState } from './lib/auth.js';
import { loadPlugins, commandList } from './lib/loader.js';
import { store } from './lib/store.js';
import { handleIncoming } from './handler.js';
import { onParticipantsUpdate, onGroupsUpdate } from './events/groups.js';

const PLUGIN_DIR = new URL('../plugins/', import.meta.url).pathname;
const startedAt = Date.now();

let sock = null;
let registry = new Map();
let reconnecting = false;
let shuttingDown = false;

const runtime = {
  startedAt,
  uptime: () => Date.now() - startedAt,
  get commands() { return commandList(registry); },
  async reload() {
    registry = await loadPlugins(PLUGIN_DIR, logger);
    return commandList(registry).length;
  },
};

async function connect() {
  const auth = await useAuthState(config, logger);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

  logger.info(`starting ${config.botName} · session=${auth.backend} · baileys=${version?.join('.') || 'default'}`);

  sock = makeWASocket({
    version,
    auth: {
      creds: auth.state.creds,
      keys: makeCacheableSignalKeyStore(auth.state.keys, baileysLogger),
    },
    logger: baileysLogger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu(config.browser),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
    getMessage: async () => ({ conversation: '' }),
  });

  runtime.sock = sock;

  // ── pairing code (no QR: good for headless servers) ────────────────────
  if (config.pairingNumber && !auth.state.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.pairingNumber);
        logger.info('────────────────────────────────────────');
        logger.info(`PAIRING CODE for ${config.pairingNumber}:  ${code}`);
        logger.info('WhatsApp → Linked Devices → Link with phone number');
        logger.info('────────────────────────────────────────');
      } catch (err) {
        logger.error({ err }, 'could not request pairing code (falling back to QR)');
      }
    }, 3000);
  }

  // ── connection lifecycle ───────────────────────────────────────────────
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !config.pairingNumber) {
      logger.info('scan this QR with WhatsApp → Linked Devices');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      reconnecting = false;
      logger.info(`✅ connected as ${sock.user?.id} (${sock.user?.name || 'no name'})`);
      sock.sendPresenceUpdate('available').catch(() => {});
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      logger.warn(`connection closed · code=${statusCode} · loggedOut=${loggedOut}`);

      if (loggedOut) {
        logger.error('session revoked — wiping stored credentials, restart to pair again');
        await auth.clear().catch(() => {});
        process.exit(0);
      }

      if (!shuttingDown && !reconnecting) {
        reconnecting = true;
        const wait = statusCode === DisconnectReason.restartRequired ? 0 : 3000;
        await delay(wait);
        connect().catch((err) => {
          logger.error({ err }, 'reconnect failed');
          setTimeout(connect, 5000);
        });
      }
    }
  });

  sock.ev.on('creds.update', auth.saveCreds);

  // ── group lifecycle (welcome / goodbye) ────────────────────────────────
  sock.ev.on('group-participants.update', (update) => {
    onParticipantsUpdate({ sock, update, store, config, logger }).catch((err) =>
      logger.error({ err }, 'group participants handler failed')
    );
  });
  sock.ev.on('groups.update', (update) => onGroupsUpdate({ update, logger }).catch(() => {}));

  // ── inbound messages ───────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;
      try {
        await handleIncoming({ sock, msg, registry, cfg: config, logger, store, runtime });
      } catch (err) {
        logger.error({ err }, 'handler crashed on a message');
      }
    }
  });

  return sock;
}

async function main() {
  await store.load();
  registry = await loadPlugins(PLUGIN_DIR, logger);
  logger.info(`${commandList(registry).length} commands loaded · prefix "${config.prefixes.join('')}" · mode=${config.mode}`);

  if (config.healthPort > 0) {
    http
      .createServer((req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ bot: config.botName, uptime: runtime.uptime(), connected: !!sock?.user }));
      })
      .listen(config.healthPort, '0.0.0.0', () => logger.info(`health server on :${config.healthPort}`));
  }

  await connect();
}

async function shutdown(signal) {
  shuttingDown = true;
  logger.info(`${signal} received — closing session`);
  try {
    await sock?.logout?.().catch(() => {});
    sock?.end?.(undefined);
  } finally {
    await store.save().catch(() => {});
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'));
process.on('uncaughtException', (err) => logger.error({ err }, 'uncaught exception'));

main().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
