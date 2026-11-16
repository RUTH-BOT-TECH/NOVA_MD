# Pairing — internals

Quick start (local run + Railway link): **[../PAIRING.md](../PAIRING.md)**.
This page is the detail: job states, API, env vars, limits.

The bot never asks for your WhatsApp password. It asks WhatsApp for a **pairing
code** on one device, you type that code into your phone, and the resulting
credentials become a **SESSION_ID** the bot can start from next time.

```
  your number ──▶ web/lib/pairer.js ──▶ Baileys socket ──▶ WhatsApp
                        │                     │
                   in-memory auth       8-char code
                        │                     ▼
                        └──────────▶ creds ──▶ SESSION_ID  ──▶ .env
```

## Run it

```bash
npm install
npm run web            # or: PORT=3000 node web/server.js
```

Open the page, enter the number **with country code, digits only**
(`2348012345678` — no `+`, no spaces, no leading `0`), and press **Get code**.

On the phone: **WhatsApp → Settings → Linked devices → Link with phone number**,
then type the eight characters.

When the link completes, the page shows the session string, the same string is
DM'd to your own chat ("Message you"), and the server forgets it after one read.
Paste it into your host as `SESSION_ID` and start the bot.

## What the code actually does

| Step | Where | Detail |
|---|---|---|
| validate | `normalizeNumber` | digits only, 8–15 long, a leading `0` gets a specific message instead of a generic error |
| socket | `memoryAuthState` | auth lives in a `Map`, no temp directory, no `creds.json` to poll for |
| request code | `connection.update` | only once WhatsApp answers the handshake (`qr` / `connecting`) — asking earlier is why codes often never link |
| code TTL | `issueCode` | marked valid for 60s, and the page counts down; `POST /api/pair/:id/code` issues another |
| accepted | `close` with `515` | WhatsApp asks for a fresh socket right after the phone accepts; the reconnect is where `creds.me` finally exists and the session is exported |
| export | `encodeSession` | `PREFIX~base64(BufferJSON(creds))`, parsed back by `src/lib/auth.js` |
| read once | `GET /api/pair/:id?consume=1` | returns the session, then deletes the job |

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/config` | brand, prefix, live stats |
| `POST` | `/api/pair` | `{ number }` → job (single-flight: the same number reuses a live job) |
| `GET` | `/api/pair/:id` | job state, code, `codeExpiresIn`, `expiresIn` |
| `POST` | `/api/pair/:id/code` | issue a fresh code for a live job |
| `POST` | `/api/pair/:id/cancel` | tear the job down |
| `GET` | `/health` | `{ ok, mode, active, linked, max }` |

States: `starting → code → linking → ready → done`, plus `error` with a message
meant for a human.

## Env

| Name | Default | Meaning |
|---|---|---|
| `PORT` / `WEB_PORT` | `3000` | listen port |
| `SESSION_PREFIX` | bot name | the part before `~` in the session string |
| `LINK_TIMEOUT_MS` | `240000` | how long a job may stay unlinked |
| `MAX_ACTIVE` | `3` | concurrent pairings; beyond this the API answers `429` |
| `PER_IP` / `WINDOW_MS` | `5` / `600000` | naive per-IP rate limit |
| `ADMIN_TOKEN` | unset | required for `GET /api/jobs` when set |
| `PAIR_FAKE` | unset | `1` = test mode, walks the states without WhatsApp |

## Testing

```bash
npm run test:pairing     # 33 assertions
```

The suite boots the real server in `PAIR_FAKE=1`, exercises validation,
single-flight, the TTL, re-issue, the one-time consume and cancel, then feeds
the session string it was handed straight into the bot's own loader
(`useSessionStringAuthState`). That last check is the one that matters: it
proves the site cannot produce a string the bot rejects.

`PAIR_FAKE` is test-only and is never on unless the variable is set.

## Limits worth knowing

- **A real link needs a real phone.** Nothing in CI can tap "Link" on WhatsApp,
  so the suite stops one step short: it proves the socket connects, the request
  reaches WhatsApp, and the string round-trips. The live path was also checked
  by hand — a number that is not on WhatsApp returns
  *"WhatsApp would not issue a code for that number"* in about two seconds.
- **Codes expire.** WhatsApp lets a code live roughly a minute; use **New code**
  rather than retyping a stale one.
- **One read.** The session is returned once, then the job is deleted. If you
  lose it, pair again.
- **A SESSION_ID is a login.** Anyone holding it controls that account. Never
  commit it, never paste it in a group; unlink the device to revoke it.
