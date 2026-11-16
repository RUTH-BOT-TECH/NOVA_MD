import path from 'node:path';
import fs from 'node:fs/promises';
import {
  useMultiFileAuthState,
  initAuthCreds,
  BufferJSON,
} from '@whiskeysockets/baileys';

/**
 * Session backends. Both return the same { state, saveCreds, clear } shape
 * that makeWASocket expects, so switching backends is a one-line env change.
 */

// ── 1. file (default) ───────────────────────────────────────────────────
export async function useFileAuthState(sessionDir) {
  const dir = path.resolve(sessionDir);
  await fs.mkdir(dir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(dir);

  return {
    backend: 'file',
    state,
    saveCreds,
    async clear() {
      await fs.rm(dir, { recursive: true, force: true });
      await fs.mkdir(dir, { recursive: true });
    },
  };
}

// ── 2. supabase (survives redeploys / ephemeral disks) ──────────────────
export async function useSupabaseAuthState(cfg, logger) {
  let createClient;
  try {
    ({ createClient } = await import('@supabase/supabase-js'));
  } catch {
    throw new Error(
      'SESSION_BACKEND=supabase needs @supabase/supabase-js — run: npm i @supabase/supabase-js'
    );
  }
  if (!cfg.url || !cfg.serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the supabase session backend');
  }

  const db = createClient(cfg.url, cfg.serviceKey, { auth: { persistSession: false } });
  const sessionId = cfg.sessionId;
  const { credsTable, keysTable } = cfg;

  // creds
  const { data: row, error } = await db
    .from(credsTable)
    .select('creds')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw new Error(`supabase creds read failed: ${error.message}`);

  const creds = row?.creds
    ? JSON.parse(row.creds, BufferJSON.reviver)
    : initAuthCreds();

  const saveCreds = async () => {
    const payload = JSON.stringify(creds, BufferJSON.replacer);
    const { error: e } = await db
      .from(credsTable)
      .upsert({ session_id: sessionId, creds: payload, updated_at: new Date().toISOString() });
    if (e) logger?.error({ e }, 'supabase creds write failed');
  };

  // signal keys, write-through memory cache
  const keyCache = new Map();
  const cacheKey = (type, id) => `${type}:${id}`;

  const keys = {
    async get(type, ids) {
      const out = {};
      const missing = [];
      for (const id of ids) {
        const hit = keyCache.get(cacheKey(type, id));
        if (hit !== undefined) out[id] = hit;
        else missing.push(id);
      }
      if (missing.length) {
        const { data, error: e } = await db
          .from(keysTable)
          .select('id, value')
          .eq('session_id', sessionId)
          .eq('type', type)
          .in('id', missing);
        if (e) logger?.error({ e }, 'supabase keys read failed');
        for (const k of data || []) {
          const v = k.value ? JSON.parse(k.value, BufferJSON.reviver) : null;
          keyCache.set(cacheKey(type, k.id), v);
          if (v !== null) out[k.id] = v;
        }
      }
      return out;
    },

    async set(data) {
      const rows = [];
      for (const type of Object.keys(data)) {
        for (const [id, value] of Object.entries(data[type] || {})) {
          keyCache.set(cacheKey(type, id), value);
          rows.push({
            session_id: sessionId,
            type,
            id,
            value: value === null ? null : JSON.stringify(value, BufferJSON.replacer),
          });
        }
      }
      if (!rows.length) return;
      const { error: e } = await db.from(keysTable).upsert(rows, { onConflict: 'session_id,type,id' });
      if (e) logger?.error({ e }, 'supabase keys write failed');
    },
  };

  return {
    backend: 'supabase',
    state: { creds, keys },
    saveCreds,
    async clear() {
      keyCache.clear();
      await db.from(keysTable).delete().eq('session_id', sessionId);
      await db.from(credsTable).delete().eq('session_id', sessionId);
    },
  };
}

// ── 3. session string (what the pairing website gives you) ──────────────
const SESSION_PREFIXES = [/^data:application\/json;base64,/i, /^base64[:\s]*/i, /^[A-Za-z0-9-]{2,24}~/];

export async function useSessionStringAuthState(sessionIdStr, sessionDir, logger) {
  let b64 = String(sessionIdStr || '').trim();
  for (const re of SESSION_PREFIXES) b64 = b64.replace(re, '');
  b64 = b64.replace(/\s+/g, '');

  if (!b64) throw new Error('SESSION_ID is empty — copy the full session string from the pairing site.');

  let raw;
  try {
    raw = Buffer.from(b64, 'base64').toString('utf8');
    const creds = JSON.parse(raw, BufferJSON.reviver);
    if (!creds?.me?.id) throw new Error('no device id');
    raw = JSON.stringify(creds, null, 2);
  } catch {
    throw new Error('SESSION_ID is not valid — expected base64 of creds.json (optionally prefixed like NOVA~…).');
  }

  const dir = path.resolve(sessionDir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'creds.json'), raw, 'utf8');
  logger?.info(`session string restored → ${dir}/creds.json`);

  const { state, saveCreds } = await useMultiFileAuthState(dir);
  return {
    backend: 'session',
    state,
    saveCreds,
    async clear() {
      await fs.rm(dir, { recursive: true, force: true });
      await fs.mkdir(dir, { recursive: true });
    },
  };
}

export async function useAuthState(config, logger) {
  if (config.sessionBackend === 'supabase') return useSupabaseAuthState(config.supabase, logger);
  if (config.sessionBackend === 'session') return useSessionStringAuthState(config.sessionId, config.sessionDir, logger);
  // auto: no files yet but a SESSION_ID is set → use it
  if (!config.sessionId) return useFileAuthState(config.sessionDir);
  try {
    await fs.access(path.resolve(config.sessionDir, 'creds.json'));
    return useFileAuthState(config.sessionDir); // already paired locally, files win
  } catch {
    return useSessionStringAuthState(config.sessionId, config.sessionDir, logger);
  }
}
