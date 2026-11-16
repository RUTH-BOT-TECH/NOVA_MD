# One-click deploy

Every file below is in the repo root, so the platforms that read repo config
(Render, Railway, Heroku, Fly, Docker) need no manual setup beyond a couple of
secrets.

```
render.yaml        Render Blueprint — bot + pairing site, two services
railway.json       Railway build/start + restart policy (the bot)
web/railway.json   Railway config for the pairing-site service
nixpacks.toml      Railway/Nixpacks — brings ffmpeg + yt-dlp
Procfile           Heroku / Railway process types
app.json           Heroku one-click (env prompts, buildpacks, worker dyno)
fly.toml           Fly.io machine + volume + health check
Dockerfile         any container host; serves /health on $PORT
docker-compose.yml bot + pairing site in one command
```

The bot is not a website, but it does answer **`GET /health`** on `$PORT`
(`PORT=0` disables it), which is what lets it run as a *web* service on free
tiers instead of a paid worker.

---

## Render — one click

[![Deploy to Render](https://img.shields.io/badge/DEPLOY_TO-RENDER-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/deploy?repo=https://github.com/RUTH-BOT-TECH/NOVA_MD)

**New → Blueprint → pick your fork.** `render.yaml` creates two services:

| service | what | start |
|---|---|---|
| `nova-md` | the bot | `node src/index.js` |
| `nova-pair` | pairing site | `node web/server.js` |

Render prompts for `OWNER_NUMBER`, `OWNER_NAME` and `SESSION_ID` (`sync: false`
means "ask, don't store in git"). Get the session from `nova-pair`, then paste
it into `nova-md` → Environment → Save (it redeploys).
Free instances sleep; use `starter` if you want it always on.

## Railway — one click

[![Deploy on Railway](https://img.shields.io/badge/DEPLOY_TO-RAILWAY-8B5CF6?style=for-the-badge&logo=railway&logoColor=white)](https://railway.com/new)

**New Project → Deploy from GitHub repo.** Railway's Railpack builder sees the
root `package.json` and runs `npm start` (`node src/index.js`) by itself, so
there is nothing to type. Add `OWNER_NUMBER` and `SESSION_ID` in *Variables*.
`railway.json` and `nixpacks.toml` are still in the repo for services created
back when Config-as-Code was open to everyone — a new service ignores them, so
if the build needs **ffmpeg/yt-dlp** either use the **Dockerfile** (Settings →
Build → Builder = Dockerfile) or add them with a builder setting. For the public
pairing page, follow the section below — it needs a second service.

Two build errors are common enough to name:

| error | cause | fix |
|---|---|---|
| `docker VOLUME at Line 21 is not supported, use Railway Volumes` | Railway built the repo-root **Dockerfile**; Dockerfile volumes are not allowed there | already fixed — the Dockerfile declares no `VOLUME`; mount a volume at `/data` in the dashboard if you want sessions to survive redeploys |
| `361 commands loaded · prefix "."` in the log, but the page 404s | the service is running the **bot**, not the pair site | set **Root Directory** = `web` and redeploy |

## Railway — the pairing link your users get

Railway is the host to pick if you want a **public pairing page**, because it
gives the service a real URL and you can run the bot and the site side by side
in one project.

**Two services, one repo, two config files:**

| service | config file | start command |
|---|---|---|
| `nova-md` | `railway.json` (repo root) | `node src/index.js` |
| `nova-pair` | Root Directory = `web` (auto-detects `npm start`) | `node server.js` |

Steps:

1. **New Project → Deploy from GitHub repo** → pick your fork. That is the bot.
2. In the same project: **+ New → GitHub Repo** → pick the *same* fork again.
   Rename this service to `nova-pair`.
3. Open `nova-pair` → **Settings → Source → Root Directory** and enter:

   ```
   web
   ```

   `web/` ships its own `package.json` and is self-contained, so Railway's
   auto-detection runs `npm start` there. Without the root directory the
   service builds the repo root and starts a second copy of the bot.

   > Railway's Settings page still offers **Add File Path** under
   > Config-as-code. It is deprecated and a service that never enabled it
   > cannot opt in, so ignore it — `web/railway.json` stays in the repo only
   > for services that already use config-as-code.

4. `nova-pair` → **Variables**:

   ```
   BOT_NAME=NOVA-MD
   SESSION_PREFIX=NOVA-MD
   REPO_URL=https://github.com/RUTH-BOT-TECH/NOVA_MD
   MAX_ACTIVE=3
   ```

   Do **not** set `WEB_PORT` or `PORT` — Railway injects `PORT` and
   `web/server.js` prefers it. Railway may auto-detect `WEB_PORT=3000` from
   `.env.example`; delete it, or the service listens on 3000 while traffic goes
   to `$PORT` and every request 502s.
5. `nova-pair` → **Settings → Networking → Generate Domain**. That URL is your
   pairing link:

   ```
   https://nova-pair-production.up.railway.app
   ```

   Check it before sharing: open it, and `https://…/health` should return
   `{"ok":true,"mode":"live",…}`.
6. Put that URL in the **bot** service's variables so `.menu` tells users where
   to pair:

   ```
   PAIR_URL=https://nova-pair-production.up.railway.app
   SESSION_ID=<the string the pairing site gave you>
   OWNER_NUMBER=234…
   ```

Two things worth knowing: the pairing page stays awake only while the service
is running, and every pairing creates a live WhatsApp socket for up to four
minutes, so keep `MAX_ACTIVE` small on a tiny instance.

## Heroku — one click

[![Deploy to Heroku](https://img.shields.io/badge/DEPLOY_TO-HEROKU-430098?style=for-the-badge&logo=heroku&logoColor=white)](https://heroku.com/deploy?template=https://github.com/RUTH-BOT-TECH/NOVA_MD)

`app.json` asks for the handful of values it needs, installs the Node **and
ffmpeg** buildpacks, and runs a **worker** dyno (a bot does not need an HTTP
dyno). Heroku has no free tier any more — this costs money.

## Koyeb

[![Deploy to Koyeb](https://img.shields.io/badge/DEPLOY_TO-KOYEB-121212?style=for-the-badge&logo=koyeb&logoColor=white)](https://app.koyeb.com/deploy?type=git&repository=github.com/RUTH-BOT-TECH/NOVA_MD&branch=main&name=nova-md)

Koyeb builds the `Dockerfile`. Set the port to **8080** and add `SESSION_ID`,
`OWNER_NUMBER` as secrets; the health check is `/health`.

## Fly.io

```bash
fly launch --copy-config --no-deploy     # keeps fly.toml
fly volumes create nova_data -s 1        # sessions survive restarts
fly secrets set SESSION_ID='NOVA-MD~…' OWNER_NUMBER=234…
fly deploy
```

## Any VPS / Docker host

```bash
git clone https://github.com/RUTH-BOT-TECH/NOVA_MD && cd NOVA_MD
cp .env.example .env       # fill in OWNER_NUMBER + SESSION_ID
docker compose up -d --build
```

That starts the bot on `:8080` and the pairing site on `:3000`, with a named
volume for the session directory. `docker run` on a single container works too.

## Shared variables

| name | needed on | why |
|---|---|---|
| `OWNER_NUMBER` | bot | who can run owner commands; also the number you pair |
| `SESSION_ID` | bot | from the pairing site — skips QR entirely |
| `OWNER_NAME` | bot | contact card / menu |
| `SESSION_BACKEND` | bot | `session` on hosts without a disk |
| `SESSION_DIR` | bot | `/tmp/sessions` (stateless) or a mounted volume |
| `PAIRING_NUMBER` | bot | optional: request a code in the logs instead of a QR |
| `WEB_PORT` | pairer | port the pairing site listens on |
| `SESSION_PREFIX` | pairer | the `NOVA-MD~` part of the session string |
| `PAIR_URL` | bot | public URL of the pairer, shown in `.menu` |
| `PAIR_ONCE` | pairer | `1` makes the link single-use — for a throwaway deploy |
| `GEMINI_API_KEY` / `GROQ_API_KEY` | bot | optional, one key turns on `.ai` |

Nothing else is required. Every command that needs a key degrades to an honest
error instead of crashing.

## What is verified, and what is not

`npm run test:deploy` checks the manifests themselves: both JSON files parse,
every service in `render.yaml` has a start command that exists in
`package.json`, `fly.toml`'s `internal_port` matches the Dockerfile's `PORT`,
the compose ports match, `Procfile` points at real entry points, and every env
var named in a manifest exists in `.env.example`.

What it cannot check is the platforms themselves — no deploy button has been
pressed from this repo, because that needs your accounts. Treat the badges as
*"the config is valid"*, not *"this was deployed on 2026-11-16"*.
