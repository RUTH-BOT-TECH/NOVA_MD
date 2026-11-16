import os from 'node:os';
import { bytes } from './ui.js';

/**
 * Where are we running?
 *
 * Each PaaS injects its own env vars, so detection is just a lookup — no
 * network calls, no guessing. Order matters: most specific first.
 * Override everything with HOST_NAME in .env (e.g. HOST_NAME="My VPS · Lagos").
 */
const RULES = [
  ['Railway',      (e) => e.RAILWAY_ENVIRONMENT || e.RAILWAY_PROJECT_ID || e.RAILWAY_SERVICE_NAME],
  ['Render',       (e) => e.RENDER || e.RENDER_SERVICE_ID],
  ['Koyeb',        (e) => e.KOYEB_APP_NAME || e.KOYEB_SERVICE_NAME],
  ['Fly.io',       (e) => e.FLY_APP_NAME || e.FLY_ALLOC_ID],
  ['Heroku',       (e) => e.DYNO],
  ['Vercel',       (e) => e.VERCEL],
  ['Netlify',      (e) => e.NETLIFY],
  ['Codespaces',   (e) => e.CODESPACES || e.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN],
  ['Replit',       (e) => e.REPL_ID || e.REPL_SLUG],
  ['Glitch',       (e) => e.PROJECT_DOMAIN && e.GLITCH_CONTAINER],
  ['Pterodactyl',  (e) => e.P_SERVER_UUID || e.PTERODACTYL],
  ['Termux',       (e) => e.TERMUX_VERSION || /com\.termux/i.test(e.PREFIX || '')],
  ['Google Cloud', (e) => e.GOOGLE_CLOUD_PROJECT || e.K_SERVICE],
  ['Azure',        (e) => e.WEBSITE_SITE_NAME || e.AZURE_HTTP_USER_AGENT],
  ['AWS',          (e) => e.AWS_EXECUTION_ENV || /^ip-\d{1,3}-\d{1,3}-\d{1,3}-\d{1,3}/.test(e.HOSTNAME || '') ],
  ['Docker',       (e) => /docker|containerd/i.test(os.hostname()) || e.CONTAINER],
];

function detect() {
  const e = process.env;
  for (const [label, test] of RULES) {
    if (test(e)) return label;
  }
  const host = os.hostname() || '';
  if (/^srv\d+\.|\.hostinger\.com|\.contabo\.|\.hetzner\./i.test(host)) return 'VPS';
  if (/^localhost$|^e2b\.|^[0-9a-f]{6,}$/i.test(host)) return 'Local';
  return host || 'unknown';
}

export function hostName() {
  return (process.env.HOST_NAME || '').trim() || detect();
}

export function systemStats() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const proc = process.memoryUsage();
  const load = os.loadavg()[0];

  return {
    host: hostName(),
    platform: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    cores: os.cpus()?.length || 1,
    node: process.version,
    pid: process.pid,
    load: Number.isFinite(load) ? load.toFixed(2) : '—',
    mem: {
      total, free, used,
      percent: total ? Math.round((used / total) * 100) : 0,
      rss: proc.rss,
      heap: proc.heapUsed,
      totalText: bytes(total),
      usedText: bytes(used),
      rssText: bytes(proc.rss),
    },
  };
}
