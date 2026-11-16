# Pairing — where it lives and how to switch it on

The pairing site is in `web/`. It is a small Express app: you enter a number,
WhatsApp shows an 8-character code on the phone, and the site hands back the
**SESSION_ID** your bot starts from. There is no QR and nothing is written to
disk.

```
web/
├── server.js       the HTTP server (this is the entry point)
├── public/
│   └── index.html  the page users see — dark UI, countdown, copy button
├── lib/
│   ├── pairer.js   the pairing engine (Baileys socket + code + job states)
│   └── session.js  encode/decode of the session string
└── railway.json    Railway config for this service (start: node web/server.js)
```

Deep dive (job states, API, env vars, limits): **[docs/PAIRING.md](docs/PAIRING.md)**.

---

## 0. One-time deploy (deploy → pair → delete)  <a id="one-time"></a>

If all you need is **one SESSION_ID** for yourself, deploy the site, use it,
then throw the service away.

**Render (recommended — one press, nothing to type).** The **DEPLOY PAIR SITE**
badge in the README opens the blueprint, and `render.yaml` declares **only** the
pair site: free plan, `rootDir: web`, no card, and not a single field to fill
in. Render reads the file, builds `web/`, runs `npm start`, and gives you a
`https://nova-pair.onrender.com` URL. Use it, then delete the service.

**Railway.** Follow [section 2](#railway) below, then delete the `nova-pair`
service when you are done.

Whichever host you use, add this variable to the pair-site service while it is
temporary:

```
PAIR_ONCE=1
```

That makes the link **single-use**: the first completed pairing is accepted and
every later attempt gets `403 This pairing link is single-use and has already
been used.` You can confirm the state at any time:

```bash
curl https://your-pair-site/health
# { "ok": true, "mode": "live", "once": true, "used": false, ... }
```

When you have the SESSION_ID: copy it, **delete the service**, and put the string
in the bot's `SESSION_ID`. Nothing on the site is needed after that — the bot
reconnects with those creds forever (until you unlink the device).

## 1. See it locally first (2 minutes)

```bash
npm install
npm run web
```

Open <http://localhost:3000>. That is the real page. Without a public URL only
you can reach it, which is fine for testing — try it with **test mode** if you
do not want to link anything yet:

```bash
PAIR_FAKE=1 npm run web     # walks the states, no phone involved
```

To actually pair locally, use your real number with country code, digits only
(`2348012345678` — no `+`, no spaces, no leading `0`), press **Get code**, then
on the phone: **WhatsApp → Settings → Linked devices → Link with phone number**.

## 2. Give users a link  <a id="railway"></a>

Users need a URL they can open, so one of the two hosts below has to be
running. Both serve the **same** app out of `web/`, which is a standalone app (its own
`package.json`), so neither host needs a start command from you.

### Render — one press, nothing to type

1. Open the **DEPLOY PAIR SITE** badge (or
   `https://render.com/deploy?repo=https://github.com/RUTH-BOT-TECH/NOVA_MD`).
2. Sign in with GitHub → **Apply**. There is nothing else: `render.yaml` already
   sets the free plan, the region, `rootDir: web`, the health check and
   `PAIR_ONCE=1`, and it asks for no secrets, so Render never stops to prompt.
3. Wait for **Live**, then open the service URL — `https://nova-pair.onrender.com`
   (yours will have a suffix). `…/health` must answer:

   ```json
   { "ok": true, "mode": "live", "root": "web", "port": 10000,
     "active": 0, "linked": 0, "max": 2, "once": true, "used": false }
   ```

   `"root": "web"` is the one field that matters: it proves Render built the
   right directory. If it says `nova-md`, the blueprint was not used.
4. Pair, copy the `SESSION_ID`, then **delete the service** (Settings → Delete
   Web Service). Free instances also go to sleep after 15 minutes idle; opening
   the page wakes them in about 50 seconds, so open the link first, then pair.

### Railway — if you prefer it

Two things go wrong on Railway often enough to name: the service builds the
repo **root** (so it starts the bot instead of the site), and a Dockerfile with
a `VOLUME` line is rejected outright. The fix for the first is one field.

1. **+ New → GitHub Repo** → your fork. Rename the service to `nova-pair`.
2. `nova-pair` → **Settings → Source → Root Directory**, and type:

   ```
   web
   ```

   That is the whole trick: Railway then detects Node inside `web/` and runs
   `npm start` → `node server.js` by itself. Leave the build and start command
   fields **empty**, and set **Builder** to **Railpack** if it is pinned to
   `Dockerfile` (`web/` has no Dockerfile).

   (If you leave Root Directory empty, Railway runs the repo root and starts the
   **bot** — the one mistake worth avoiding.)

   > Railway's Settings page still offers **Add File Path** under
   > Config-as-code. It is deprecated and a service that never enabled it
   > cannot opt in, so ignore it.

3. `nova-pair` → **Variables**:

   ```
   BOT_NAME=NOVA-MD
   SESSION_PREFIX=NOVA-MD
   REPO_URL=https://github.com/RUTH-BOT-TECH/NOVA_MD
   MAX_ACTIVE=3
   PAIR_ONCE=1
   ```

   **Delete `WEB_PORT` if Railway auto-detected one.** Railway scans the repo
   and happily fills in `WEB_PORT=3000` from `.env.example`, but it routes
   traffic to the `PORT` it injects — so a service listening on 3000 answers
   `502` with a perfectly healthy process behind it. `web/server.js` lets the
   injected `PORT` win and logs `WEB_PORT=… ignored`, but removing the variable
   is the clean fix.

4. `nova-pair` → **Settings → Networking → Generate Domain**. Same check as
   above: `…/health` must say `"root":"web"`.

### Then, on the bot

Whatever host runs the bot, set what the site gave you and where it lives:

```
OWNER_NUMBER=234…
SESSION_ID=NOVA-MD~eyJub2lzZUtleSI6…
PAIR_URL=https://nova-pair.onrender.com
```

`.menu` then prints the pairing link for everyone, so nobody has to ask.

## 3. What the user experiences

```
their phone                              your Railway service
─────────────                            ─────────────────────
open the link          ───────────────▶  web/public/index.html
type 2348012345678     ───────────────▶  POST /api/pair        → job + code
WhatsApp → Linked      ◀───────────────  code shown, 60s countdown
devices → enter code                     connection: open      → creds
copy SESSION_ID        ◀───────────────  GET /api/pair/:id?consume=1
```

The session is shown **once**, and a copy is DM'd to their own chat as backup.
They paste it into their host as `SESSION_ID`; the bot starts from it and never
asks for a code again.

## Keep in mind

- A code lives about **60 seconds**. The page has a **New code** button for that.
- One pairing holds a live WhatsApp socket for up to 4 minutes — keep
  `MAX_ACTIVE` small on a tiny instance.
- **A SESSION_ID is a login.** Anyone holding it controls that account. Never
  commit it, never paste it in a group; revoke by unlinking the device.
- Someone else can pair *their* number through your site and get *their* session.
  That is expected — the site never sees a password. If you would rather only
  you can pair, set `ADMIN_TOKEN` and keep the URL private.
