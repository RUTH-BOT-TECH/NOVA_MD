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

**Render (one click).** The **DEPLOY PAIR SITE** badge in the README opens the
blueprint. It creates two services; you only need `nova-pair`. Once the pair
site has a URL, delete the `nova-md` service you do not need — or just ignore it.

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

## 2. Give users a link (Railway)  <a id="railway"></a>

This is the part you want, because users need a URL they can open.

**Both services come from this one repo.**

1. **New Project → Deploy from GitHub repo** → your fork. This service is the
   **bot** and uses `railway.json` from the repo root.
2. In the same project, **+ New → GitHub Repo** → the **same** fork again.
   Rename this service to `nova-pair`.
3. Open `nova-pair` → **Settings → Deploy → Custom Start Command**, and type:

   ```
   node web/server.js
   ```

   This is the step that matters. Without it the service runs `npm start`,
   which boots a **second copy of the bot** instead of the pair site. Leave
   **Root Directory** empty — the site imports from `src/`, so it needs the
   whole repo.

   Then, in the same panel, set **Healthcheck Path** to `/health`.

   > Railway's own Settings page says Config-as-Code is deprecated, and that
   > services which never used it cannot opt in any more. So ignore the
   > **Add File Path** button: `web/railway.json` stays in the repo for
   > services that already had it, and the dashboard settings above are the
   > supported route.
4. `nova-pair` → **Variables**:

   ```
   BOT_NAME=NOVA-MD
   SESSION_PREFIX=NOVA-MD
   REPO_URL=https://github.com/RUTH-BOT-TECH/NOVA_MD
   MAX_ACTIVE=3
   ```

   **Delete `WEB_PORT` if Railway auto-detected one.** Railway scans the repo
   and happily fills in `WEB_PORT=3000` from `.env.example`, but it routes
   traffic to the `PORT` it injects — so a service listening on 3000 answers
   `502` with a perfectly healthy process behind it. `web/server.js` now lets
   the injected `PORT` win and logs `WEB_PORT=… ignored` when that happens, but
   the clean fix is to remove the variable. For a throwaway link add
   `PAIR_ONCE=1` (see [section 0](#one-time)).

5. `nova-pair` → **Settings → Networking → Generate Domain**. That URL is the
   link you give people:

   ```
   https://nova-pair-production.up.railway.app
   ```

   Open it, and also open `…/health`. It must answer:

   ```json
   { "ok": true, "mode": "live", "active": 0, "linked": 0, "max": 3 }
   ```

6. Back in the **bot** service → Variables, save what the site gave you and
   where it lives:

   ```
   OWNER_NUMBER=234…
   SESSION_ID=NOVA-MD~eyJub2lzZUtleSI6…
   PAIR_URL=https://nova-pair-production.up.railway.app
   ```

   `.menu` then prints the pairing link for everyone, so nobody has to ask.

Prefer Render instead? `render.yaml` already creates both services in one click —
see **[docs/DEPLOY.md](docs/DEPLOY.md)**.

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
