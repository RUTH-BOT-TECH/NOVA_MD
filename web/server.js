import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPairing, getJob, cancelPairing, stats, listJobs, sweep, PairError } from './lib/pairer.js';
import { config } from '../src/config.js';
import { logger } from '../src/lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// naive per-IP limiter — swap for express-rate-limit behind a real proxy
const PER_IP = Number(process.env.PER_IP || 5);
const WINDOW_MS = Number(process.env.WINDOW_MS || 10 * 60 * 1000);
const hits = new Map();
function limit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const rec = hits.get(ip) || { count: 0, reset: now + WINDOW_MS };
  if (now > rec.reset) { rec.count = 0; rec.reset = now + WINDOW_MS; }
  rec.count++;
  hits.set(ip, rec);
  if (rec.count > PER_IP) {
    return res.status(429).json({ error: `Too many attempts. Try again in ${Math.ceil((rec.reset - now) / 60000)} min.` });
  }
  next();
}
setInterval(() => { for (const [ip, r] of hits) if (Date.now() > r.reset) hits.delete(ip); }, 60_000).unref();
setInterval(() => sweep().catch(() => {}), 60_000).unref();

app.get('/api/config', (req, res) => {
  res.json({
    botName: config.botName,
    ownerName: config.ownerName,
    repoUrl: config.repoUrl,
    prefix: config.prefixes.join(''),
    sessionPrefix: process.env.SESSION_PREFIX || config.botName.replace(/[^A-Za-z0-9-]/g, ''),
    stats: stats(),
  });
});

app.post('/api/pair', limit, async (req, res) => {
  try {
    const job = await startPairing(req.body?.number);
    res.json({ id: job.id, state: job.state, code: job.code });
  } catch (err) {
    const status = err instanceof PairError ? err.status : 500;
    if (status === 500) logger.error({ err }, 'pair failed');
    res.status(status).json({ error: err.message });
  }
});

app.get('/api/pair/:id', (req, res) => {
  const job = getJob(req.params.id, { consume: req.query.consume === '1' });
  if (!job) return res.status(404).json({ error: 'That pairing session expired. Start over.' });
  res.json(job);
});

app.post('/api/pair/:id/cancel', async (req, res) => {
  const ok = await cancelPairing(req.params.id);
  res.json({ cancelled: ok });
});

app.get('/api/jobs', (req, res) => {
  if (process.env.ADMIN_TOKEN && req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  res.json(listJobs());
});

app.get('/health', (req, res) => res.json({ ok: true, ...stats() }));
app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const port = Number(process.env.WEB_PORT || process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => logger.info(`${config.botName} pairing site → http://0.0.0.0:${port}`));
