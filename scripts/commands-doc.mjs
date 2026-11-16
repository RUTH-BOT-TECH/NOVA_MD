/**
 * Generates docs/COMMANDS.md from the live registry — the catalogue can never
 * drift from the code. Run: npm run docs
 */
import fs from 'node:fs/promises';
import { loadPlugins, commandList } from '../src/lib/loader.js';

const ORDER = ['general', 'group', 'owner', 'tools', 'text', 'converter', 'image',
  'media', 'anime', 'fun', 'games', 'download', 'ai', 'misc'];

const registry = await loadPlugins(new URL('../plugins/', import.meta.url).pathname);
const plugins = commandList(registry);
const aliases = [...registry.keys()].length;

const byCat = new Map();
for (const p of plugins) {
  const cat = (p.category || 'misc').toLowerCase();
  if (!byCat.has(cat)) byCat.set(cat, []);
  byCat.get(cat).push(p);
}
const cats = [...byCat.entries()].sort(
  ([a], [b]) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99)
);

const access = (p) =>
  p.ownerOnly ? '👑 owner' : p.adminOnly ? '🛡️ admin' : p.botAdminNeeded ? '🛡️ admin+bot' : p.groupOnly ? 'group' : 'everyone';

const lines = [
  '# Command catalogue',
  '',
  `Generated from the registry — **${plugins.length} commands**, ${aliases} names with aliases, ${cats.length} categories.`,
  '',
  'Regenerate with `npm run docs`.',
  '',
  '| Category | Commands |',
  '|---|---|',
  ...cats.map(([cat, list]) => `| [${cat}](#${cat}) | ${list.length} |`),
  '',
];

for (const [cat, list] of cats) {
  lines.push(`## ${cat}`, '', '| Command | Aliases | Access | What it does |', '|---|---|---|---|');
  for (const p of list.sort((a, b) => a.name.localeCompare(b.name))) {
    const al = (p.aliases || []).filter((a) => a.length <= 14).slice(0, 3).map((a) => `\`${a}\``).join(' ') || '—';
    lines.push(`| \`${p.name}\` | ${al} | ${access(p)} | ${p.description || '—'} |`);
  }
  lines.push('');
}

await fs.mkdir(new URL('../docs/', import.meta.url), { recursive: true });
await fs.writeFile(new URL('../docs/COMMANDS.md', import.meta.url), lines.join('\n'), 'utf8');
console.log(`docs/COMMANDS.md → ${plugins.length} commands across ${cats.length} categories`);
