<div align="center">

<img src="docs/banner.png" alt="NOVA-MD — Fast, secure, scalable, open source" width="100%" />

# NOVA-MD

**A WhatsApp bot written from scratch on Baileys.**
No boilerplate, no copied commands, no dead stubs.

<p>
  <img alt="commands" src="https://img.shields.io/badge/commands-299-25d366?style=for-the-badge&labelColor=0d1117" />
  <img alt="categories" src="https://img.shields.io/badge/categories-22-25d366?style=for-the-badge&labelColor=0d1117" />
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A520-0d1117?style=for-the-badge&logo=node.js&logoColor=25d366" />
  <img alt="baileys" src="https://img.shields.io/badge/baileys-6.7.24-0d1117?style=for-the-badge" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-0d1117?style=for-the-badge" />
</p>

[Commands](docs/COMMANDS.md) · [Deployment](#deployment) · [Testing](#testing) · [Security](#security)

</div>

---

## Quick start

```bash
git clone https://github.com/RUTH-BOT-TECH/NOVA_MD.git
cd NOVA_MD && npm install
cp .env.example .env      # set OWNER_NUMBER
npm start
```

First run links the bot one of three ways:

| Method | Set | You get |
|---|---|---|
| **QR** | nothing | scan with WhatsApp → Linked Devices |
| **Pairing code** | `PAIRING_NUMBER=234…` | an 8-character code in the console |
| **Session ID** | `SESSION_ID=…` | a string pasted from the pairing website |

## Features

- **299 commands · 22 categories** — every one runs through the same handler, guard and help system.
- **Pairing website** — `web/`: enter a number, get a code, receive a `SESSION_ID`. Self-hosted, own branding.
- **Menu** — small-caps blocks, live host/CPU/RAM/uptime stats, branded contact card. Never hardcoded.
- **Sessions** — local files, Supabase, or an env string. Switch with one variable.
- **Media** — 25 sharp image operations, sticker metadata editing, ffmpeg audio pipeline.
- **Downloads** — five-strategy resolver (API template → Piped → Invidious → `yt-dlp` → `ytdl-core`).
- **AI** — Gemini, Groq, OpenAI, OpenRouter or DeepSeek. Bring one key, first configured wins.
- **Tests** — nine suites, most offline. A fake WhatsApp socket exercises every command end to end.

## Commands

Full catalogue with usage: **[docs/COMMANDS.md](docs/COMMANDS.md)** · in chat: `.menu` or `.menu <category>`

```
general  group  owner  tools  dev  search  text  textmaker  converter  image  media
audio  anime  fun  games  economy  download  ai  reactions  social  faith  misc
```

Every network command degrades with a specific fix instead of failing silently —
see **[docs/INTEGRATION.md](docs/INTEGRATION.md)** for the per-command report.

## Deployment

| Host | Works | Note |
|---|---|---|
| Railway · Koyeb · Fly.io | ✅ | recommended — persistent socket |
| VPS / Termux / Pterodactyl | ✅ | install `ffmpeg` + `yt-dlp` for media |
| Docker | ✅ | `Dockerfile` bakes both in |
| Vercel · Netlify | ❌ | serverless cannot hold the socket (host `web/` there instead) |

Before blaming the bot, ask the host:

```bash
npm run doctor      # ffmpeg · yt-dlp · download strategies · AI keys
```

## Testing

```bash
npm run smoke              # every plugin loads, offline
npm run test:commands      # guards, aliases, no collisions, README stays honest
npm run test:integration   # all commands through the real handler, fake socket
npm run test:image         # 25/25 sharp operations
npm run test:text          # 101/101 unicode style assertions
npm run test:economy       # 18/18 money invariants
npm run test:audio         # ffmpeg args, webp EXIF round-trip
npm run test:live          # hits the real APIs (needs internet)
```

## Security

- `.env`, `sessions/`, `data/*.json` and `cookies.txt` are gitignored — **never** commit them.
- A `SESSION_ID` is full access to the WhatsApp account. Treat it like a password, rotate if leaked.
- `ownerOnly`, `adminOnly`, `groupOnly` and `botAdminNeeded` are enforced in the handler, so a plugin cannot bypass them.
- Pairing tokens are one-shot: the site hands the session over once, then destroys the job.

## License

MIT — see [LICENSE](LICENSE). Built and maintained by the NOVA-MD contributors.
