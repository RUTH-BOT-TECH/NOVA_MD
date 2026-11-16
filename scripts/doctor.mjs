/** Prints what this host can actually do. Run: npm run doctor */
import { probe, hasFfmpeg } from '../src/lib/ytdlp.js';
import { strategyStatus } from '../src/lib/yt-resolver.js';
import { availableProviders } from '../src/lib/ai.js';
import { systemStats } from '../src/lib/system.js';

const stats = systemStats();
const yt = await probe();
const strategies = await strategyStatus();

console.log(`host        ${stats.host}`);
console.log(`node        ${stats.node} · ${stats.cores} cores`);
console.log(`ffmpeg      ${(await hasFfmpeg()) ? 'ok' : 'MISSING — no audio remux / video merge'}`);
console.log(`yt-dlp      ${yt.ok ? yt.version : `MISSING — ${yt.error}`}`);
console.log('download strategies:');
for (const [k, v] of Object.entries(strategies)) console.log(`  ${k.padEnd(14)} ${v}`);
const ai = availableProviders();
console.log(`ai          ${ai.length ? ai.join(', ') : 'no key configured'}`);
console.log(`session     ${process.env.SESSION_BACKEND || (process.env.SESSION_ID ? 'session (env)' : 'file')}`);
