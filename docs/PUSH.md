# Pushing to `RUTH-BOT-TECH/NOVA_MD`

This workspace already has a clean git history (2 commits, ~115 tracked files).
The only missing piece is a remote + credentials — this sandbox has no GitHub access.

The upstream repo is currently **empty** (no commits, no README), so the first push creates `main`.

## From your machine

```bash
git remote add origin https://github.com/RUTH-BOT-TECH/NOVA_MD.git
git branch -M main
git push -u origin main
```

Non-interactive (fine-grained token limited to that repo, `Contents: read and write`):

```bash
git remote add origin https://<USER>:<TOKEN>@github.com/RUTH-BOT-TECH/NOVA_MD.git
git push -u origin main
```

## What is deliberately not committed

A session or `.env` in git is a hijacked bot.

| Path | Why |
|---|---|
| `.env` | owner number, API keys, `SESSION_ID` |
| `sessions/` | live WhatsApp credentials |
| `data/*.json` | economy balances, group settings, notes |
| `node_modules/` | rebuild with `npm ci` |
| `cookies.txt` | YouTube cookies |
| `*player-script.js`, `*watch.html` | yt-dlp debug dumps |

## After the push

1. **Vercel cannot run the bot** — it needs a persistent socket. Host the bot on Railway / Koyeb / a VPS; the pairing site (`web/`) can go on Vercel if you want it public.
2. Copy `.env.example` → `.env` on the host and set `OWNER_NUMBER`, then either `SESSION_ID` (from the pairing site) or `PAIRING_NUMBER`.
3. `npm ci && npm start` — first run prints a pairing code or QR.
4. Check the host before blaming the bot:

```bash
npm run doctor     # ffmpeg · yt-dlp · download strategies · AI keys
npm run smoke      # 299 commands load offline, no WhatsApp needed
```
