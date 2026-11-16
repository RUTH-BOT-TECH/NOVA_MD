import 'dotenv/config';

const digits = (v = '') => String(v).replace(/[^0-9]/g, '');
const list = (v = '') => String(v).split(',').map((s) => s.trim()).filter(Boolean);
const bool = (v, fallback = false) =>
  v === undefined ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());

export const config = {
  // ── identity (this is the ONLY place your branding lives) ──────────────
  botName: process.env.BOT_NAME?.trim() || 'NOVA-MD',
  displayName: process.env.BOT_DISPLAY_NAME?.trim() || '', // optional fancy unicode name for the menu header
  pairSiteUrl: process.env.PAIRING_SITE_URL || `http://localhost:${process.env.WEB_PORT || 3000}`,
  hostName: process.env.HOST_NAME?.trim() || '', // override the auto-detected host label
  nameTick: process.env.NAME_TICK ?? '✓', // what sits after the name on the contact card ('' to disable)
  brandCard: bool(process.env.BRAND_CARD, true), // attach the branded contact card to .menu
  ownerName: process.env.OWNER_NAME?.trim() || 'Bot Owner',
  ownerNumber: digits(process.env.OWNER_NUMBER), // 2348012345678
  extraOwners: list(process.env.EXTRA_OWNERS).map(digits).filter(Boolean), // "234...,234..."
  repoUrl: process.env.REPO_URL || 'https://github.com/RUTH-BOT-TECH/NOVA_MD',
  // public URL of the pairing site once it is deployed (e.g. on Railway)
  pairUrl: (process.env.PAIR_URL || '').replace(/\/+$/, ''),
  version: '1.2.0',

  // ── behaviour ─────────────────────────────────────────────────────────
  prefixes: list(process.env.PREFIXES || '.').join('').split(''),
  mode: (process.env.MODE || 'public').toLowerCase(), // public | self
  autoRead: bool(process.env.AUTO_READ),
  autoTyping: bool(process.env.AUTO_TYPING),
  cooldownMs: Number(process.env.COMMAND_COOLDOWN_MS || 1500),

  // ── connection ────────────────────────────────────────────────────────
  pairingNumber: digits(process.env.PAIRING_NUMBER), // set to log in with an 8-char code instead of QR
  browser: process.env.BROWSER || 'NOVA-MD', // shows up in WhatsApp > Linked Devices
  sessionBackend: (process.env.SESSION_BACKEND || 'file').toLowerCase(), // file | supabase | session
  sessionDir: process.env.SESSION_DIR || 'sessions',
  sessionId: process.env.SESSION_ID || '', // base64 creds handed out by the pairing site

  // ── supabase session storage (only used when SESSION_BACKEND=supabase) ─
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    sessionId: process.env.SUPABASE_SESSION_ID || 'main',
    credsTable: process.env.SUPABASE_CREDS_TABLE || 'wa_creds',
    keysTable: process.env.SUPABASE_KEYS_TABLE || 'wa_signal_keys',
  },

  // ── misc ──────────────────────────────────────────────────────────────
  healthPort: Number(process.env.PORT || 0), // >0 starts a tiny /health server
  timezone: process.env.TZ || 'Africa/Lagos',
  defaultCity: process.env.DEFAULT_CITY || '',
  economy: {
    name: process.env.CURRENCY_NAME || 'Nova',
    symbol: process.env.CURRENCY_SYMBOL || '₦',
    dailyAmount: Number(process.env.ECONOMY_DAILY || 2500),
    startBalance: Number(process.env.ECONOMY_START || 1000),
  },
  maxDownloadMb: Number(process.env.MAX_DOWNLOAD_MB || 48),
};

export function isOwnerJid(jid = '') {
  const phone = String(jid).split('@')[0].split(':')[0];
  return [config.ownerNumber, ...config.extraOwners].filter(Boolean).includes(phone);
}

export default config;
