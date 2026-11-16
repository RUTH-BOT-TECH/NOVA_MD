import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function walk(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (e.name.endsWith('.js') || e.name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

/**
 * Every file in /plugins that default-exports an object with a `name`
 * is a command. Folders are just categories — nesting is free.
 */
export async function loadPlugins(dir, logger) {
  const registry = new Map();
  const collisions = [];
  const files = (await walk(dir)).sort();

  for (const file of files) {
    try {
      const url = pathToFileURL(file).href;
      const mod = await import(url);
      // a file may export one command, or an array of them (factories)
      const exported = Array.isArray(mod.default) ? mod.default : [mod.default];
      const usable = exported.filter((p) => p?.name);
      if (!usable.length) {
        logger?.warn({ file }, 'plugin has no default export with a name — skipped');
        continue;
      }
      for (const plugin of usable) {
        plugin.file = path.relative(dir, file);
        plugin.category = plugin.category || path.dirname(plugin.file).split(path.sep)[0] || 'misc';
        plugin.aliases = plugin.aliases || [];
        plugin.onMessage = plugin.onMessage || null;
        for (const key of [plugin.name, ...plugin.aliases]) {
          const k = String(key).toLowerCase();
          const existing = registry.get(k);
          if (existing && existing !== plugin) {
            // Never overwrite silently: a clashing alias would erase a command.
            collisions.push({ key: k, kept: existing.name, keptFile: existing.file, dropped: plugin.name, droppedFile: plugin.file });
            logger?.warn({ key: k, kept: existing.name, dropped: plugin.name }, 'command/alias collision — keeping the first');
            continue;
          }
          registry.set(k, plugin);
        }
      }
      logger?.info(`loaded ${path.relative(dir, file)} → ${usable.map((p) => p.name).join(', ')}`);
      continue;
      /* eslint-disable no-unreachable */
    } catch (err) {
      logger?.error({ err, file }, 'failed to load plugin');
    }
  }
  // callers (tests, CLI) can inspect clashes instead of discovering them in chat
  Object.defineProperty(registry, 'collisions', { value: collisions, enumerable: false });
  return registry;
}

export function commandList(registry) {
  return [...new Set(registry.values())];
}
