/**
 * Config for the pairing site, kept inside web/ on purpose.
 *
 * The site must deploy as its own app — on Railway that means pointing the
 * service's Root Directory at `web/` and pressing deploy, with no start command
 * to remember. Anything this file imported from `../src` would be outside that
 * directory at build time, so the site carries its own copy of the few values
 * it needs. Same variable names as the bot, so one .env still makes sense.
 */

const int = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
  botName: (process.env.BOT_NAME || 'NOVA-MD').trim(),
  ownerName: (process.env.OWNER_NAME || '').trim(),
  repoUrl: (process.env.REPO_URL || '').trim(),

  // the part before `~` in the SESSION_ID this site hands out
  sessionPrefix: (process.env.SESSION_PREFIX || process.env.BOT_NAME || 'NOVA-MD')
    .replace(/[^A-Za-z0-9-]/g, '')
    .slice(0, 24) || 'NOVA-MD',

  maxActive: int(process.env.MAX_ACTIVE, 3),
  linkTimeoutMs: int(process.env.LINK_TIMEOUT_MS, 4 * 60 * 1000),
  codeTtlMs: int(process.env.CODE_TTL_MS, 60 * 1000),

  perIp: int(process.env.PER_IP, 5),
  windowMs: int(process.env.WINDOW_MS, 10 * 60 * 1000),

  // shown on the page as a hint; the pairer itself never parses commands
  prefix: (process.env.PREFIXES || '.').trim() || '.',

  adminToken: (process.env.ADMIN_TOKEN || '').trim(),
  pairOnce: process.env.PAIR_ONCE === '1',
  fake: process.env.PAIR_FAKE === '1',
};

export default config;
