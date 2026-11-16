import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Dead-simple JSON store for per-group settings (antilink, welcome, mute...).
 * Swap for Supabase later if you go multi-tenant.
 */
export class JsonStore {
  constructor(file = 'data/groups.json') {
    this.file = path.resolve(file);
    this.data = {};
    this._timer = null;
  }

  async load() {
    try {
      this.data = JSON.parse(await fs.readFile(this.file, 'utf8'));
    } catch {
      this.data = {};
    }
    return this;
  }

  get(jid, key, fallback = undefined) {
    const g = this.data[jid] || {};
    return key === undefined ? { ...g } : (g[key] ?? fallback);
  }

  set(jid, patch) {
    this.data[jid] = { ...(this.data[jid] || {}), ...patch };
    this._scheduleSave();
    return this.data[jid];
  }

  /** All [key, value] pairs — used by leaderboards and admin listings. */
  entries(prefix = '') {
    return Object.entries(this.data).filter(([k]) => k.startsWith(prefix));
  }

  delete(jid) {
    delete this.data[jid];
    this._scheduleSave();
  }

  _scheduleSave() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.save().catch(() => {}), 300);
  }

  async save() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(this.data, null, 2));
  }
}

export const store = new JsonStore();
