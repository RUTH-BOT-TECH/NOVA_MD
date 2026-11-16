import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';

/**
 * The session string, in one place.
 *
 * The pairing site hands this out and the bot (`src/lib/auth.js`) reads it back,
 * so both sides must agree exactly: base64 of the BufferJSON-encoded creds,
 * optionally prefixed with the bot name and a `~`. Keeping encode/decode here
 * means the pairer and the tests exercise the same code the bot parses.
 */

export const encodeSession = (creds, prefix = 'NOVA-MD') =>
  `${prefix}~${Buffer.from(JSON.stringify(creds, BufferJSON.replacer), 'utf8').toString('base64')}`;

/** Mirrors the prefix-stripping in src/lib/auth.js. Throws on anything unusable. */
export function decodeSession(sessionString) {
  let b64 = String(sessionString || '').trim();
  for (const re of [/^data:application\/json;base64,/i, /^base64[:\s]*/i, /^[A-Za-z0-9-]{2,24}~/]) b64 = b64.replace(re, '');
  b64 = b64.replace(/\s+/g, '');
  if (!b64) throw new Error('empty session string');

  const creds = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'), BufferJSON.reviver);
  if (!creds?.me?.id) throw new Error('session has no device id');
  if (!creds?.signedIdentityKey?.private) throw new Error('session has no identity key');
  return creds;
}

/**
 * In-memory auth state for the pairing socket.
 *
 * Disk-backed state was leaving temp directories behind and made "has the
 * session been written yet?" a polling game. Holding the Signal key store in a
 * Map means the creds are complete the moment `connection: open` fires.
 */
export function memoryAuthState() {
  const creds = initAuthCreds();
  const keys = new Map();
  const key = (type, id) => `${type}:${id}`;

  return {
    creds,
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const out = {};
          for (const id of ids) out[id] = keys.get(key(type, id));
          return out;
        },
        set: (data) => {
          for (const [type, ids] of Object.entries(data)) {
            for (const [id, value] of Object.entries(ids)) keys.set(key(type, id), value);
          }
        },
      },
    },
    /** Baileys' `saveCreds` contract. */
    saveCreds: async () => {},
    keyCount: () => keys.size,
  };
}
