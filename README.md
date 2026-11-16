<p align="center">
  <img src="docs/banner.png" alt="NOVA-MD — next-gen WhatsApp automation, built on Baileys" width="100%" />
</p>

<h3 align="center">NOVA-MD</h3>

<p align="center">
  A WhatsApp bot built from scratch on <b>Baileys</b> — plugin-based commands, owner &amp; group-admin guards,
  and a pairing website that hands out a <code>SESSION_ID</code> instead of making you scan a QR.
</p>

<p align="center">
  <img alt="node" src="https://img.shields.io/badge/node-20%2B-25d366?style=for-the-badge&logo=node.js&logoColor=white&labelColor=0d1117" />
  <img alt="baileys" src="https://img.shields.io/badge/baileys-6.7.24-25d366?style=for-the-badge&labelColor=0d1117" />
  <img alt="commands" src="https://img.shields.io/badge/commands-299-25d366?style=for-the-badge&labelColor=0d1117" />
  <img alt="license" src="https://img.shields.io/badge/license-MIT-25d366?style=for-the-badge&labelColor=0d1117" />
</p>

<p align="center">
  <code>Node 20+</code> · <code>ESM</code> · <code>no database required</code> · <code>hosts anywhere</code>
</p>

---

## What's inside

| | |
|---|---|
| **Commands** | Drop a file in `plugins/`, it's live. Guards: `ownerOnly`, `adminOnly`, `groupOnly`, `botAdminNeeded`, cooldowns. |
| **Login** | QR code, 8-char pairing code, or a `SESSION_ID` generated on the website. |
| **Sessions** | Local files, Supabase, or an env-var string. Switch with one variable. |
| **Pairing site** | `web/` — number in → code out → `SESSION_ID` back in your own WhatsApp chat. |
| **Menu** | Small-caps unicode blocks, live host/CPU/RAM stats, and a branded contact card before the menu. |
| **Group events** | Welcome / goodbye templates with `{user} {group} {count}`, persisted per group, off by default. |
| **Offline tests** | `npm run smoke` runs every command through the real handler with a stub socket. |

---

## Structure

```
nova-md/
├── src/
│   ├── index.js              entry: socket, login, reconnect, events
│   ├── config.js             ⭐ all branding + settings (reads .env)
│   ├── handler.js            message → ctx → guards → dispatch
│   └── lib/
│       ├── auth.js           session backends: file · supabase · session-string
│       ├── loader.js         walks /plugins, builds the command registry
│       ├── message.js        unwraps ephemeral/view-once, extracts text
│       ├── group.js          metadata cache, admin checks, target resolution
│       ├── store.js          JSON persistence for per-group toggles
│       ├── http.js           fetch with timeout + provider fallback
│       ├── yt-resolver.js    5-strategy YouTube resolver (api → piped → invidious → yt-dlp → ytdl-core)
│       ├── ytdlp.js          spawn wrapper for the yt-dlp binary
│       ├── ai.js             provider-agnostic chat completion + memory
│       ├── ffmpeg.js         optional ffmpeg wrapper — pure arg builders, tested without the binary
│       ├── webp-exif.js      rips open the webp RIFF container to write sticker pack metadata
│       ├── media.js          sharp: image → sticker → png
│       ├── vcard.js          contact-card messages
│       └── logger.js         pino loggers (ours + a silent one for Baileys)
├── plugins/                  one file = one command
│   ├── general/              menu · ping · alive · repo · speed · sysinfo
│   ├── group/                tagall · kick · promote · demote · mute · unmute · antilink
│   │                         groupinfo · admins · link · poll
│   ├── owner/
│   │   ├── admin.js          prefix · sudo · blacklist · maintenance · join · setpp · cleartmp
│   │   ├── mode.js           .mode public | self
│   │   ├── broadcast.js      send to every group
│   │   └── reload.js         hot-reload plugins
│   ├── search/
│   │   └── search.js         wiki · npm · github · define · book · tv · news · crypto · currency · ip · lyrics
│   ├── misc/
│   │   └── misc.js           short · translate · remind · note
│   ├── dev/                  colour · timestamp · json · regex · jwt · url · bmi · age · rand · entropy
│   ├── social/               afk (with onMessage hook) · back · birthday
│   ├── faith/                verse (embedded KJV) · prayer · qibla
│   ├── tools/                vv · qr · vcard · sticker · toimg · getpp · whoami
│   ├── text/                 fancy · ciphers (rot13/caesar/morse/atbash) · hashes · uuid
│   ├── textmaker/             21 unicode styles from one tested lib (src/lib/textmaker.js)
│   ├── converter/            29 unit + base conversions (one factory, one file)
│   ├── image/                25 sharp ops — blur · sepia · pixelate · circle · deepfry …
│   ├── media/                save · saveimg · savevideo · saveaudio · savedoc · take · stickerinfo
│   ├── audio/                tomp3 · tovoice · toaudio · reverseaudio · volume · audiospeed · trim · waveform · togif
│   ├── anime/                anime · kiss (hug, pat, slap, cuddle…)
│   ├── economy/              12 — daily · work · deposit · pay · rob · gamble · slots · rich (real persisted balances)
│   ├── reactions/            18 emoji reactions that land on the quoted message
│   ├── fun/                  joke · fact · riddle · ship · rps · horoscope …
│   └── games/                8ball · truth · dare · quote · dice
├── web/                      🔗 pairing website
│   ├── server.js             express: /api/pair, /api/pair/:id, /health
│   ├── events/groups.js      group-participants.update → welcome / goodbye
│   ├── lib/pairer.js         isolated auth dirs, code issuing, session export
│   └── public/index.html     the page (single file, no build step, no CDN)
├── docs/                     banner.png · COMMANDS.md · menu-preview.txt
├── scripts/
│   ├── doctor.mjs            prints what this host can actually do
│   ├── smoke.mjs             offline test harness
│   ├── test-live.mjs         hits the real APIs (needs internet)
│   ├── test-commands.mjs     end-to-end pass over every family
│   ├── test-image.mjs        applies all 25 sharp ops to a test image
│   ├── commands-doc.mjs      generates docs/COMMANDS.md from the registry
│   └── preview-menu.mjs      renders .menu → docs/menu-preview.txt
├── supabase/0001_*.sql       tables for the Supabase session backend
├── sessions/  data/          runtime state — gitignored
├── Dockerfile · ecosystem.config.cjs · .env.example
└── package.json
```

---

## Quickstart

```bash
npm install
cp .env.example .env        # set BOT_NAME, OWNER_NAME, OWNER_NUMBER, REPO_URL
npm run smoke               # 15 commands load; fake messages flow through the handler
npm start                   # QR prints in the terminal
```

Link it however you prefer:

```bash
# 1 · QR — leave PAIRING_NUMBER empty, scan with WhatsApp → Linked Devices
# 2 · pairing code
PAIRING_NUMBER=2348012345678 npm start
# 3 · session string from the website (below)
SESSION_ID=NOVA~eyJub2lzZUtleSI6... npm start
```

`npm start` prints the code or QR and stays connected. Ctrl-C cleanly closes the session.

---

## The pairing website

```bash
npm run web                 # http://localhost:3000
```

Four steps, no QR scanner, no second device:

1. Visitor types their number (country code, digits only).
2. The server spins up an **isolated temp auth directory** and calls `requestPairingCode()` — fired off the `qr`/`connecting` event, not straight after `makeWASocket`, because the socket isn't ready earlier. That timing bug is why most homemade pair sites hand out codes that never link.
3. They type the 8-char code on their phone.
4. On `connection === 'open'` the server reads `creds.json`, base64s it (BufferJSON format), and **DMs the `SESSION_ID` to that same account's "Message yourself" chat** — then deletes the temp directory.

The page shows the session once, and the DM is the durable copy — so a shared screen isn't a credential leak.

**API**

| Method | Path | Does |
|---|---|---|
| `GET` | `/api/config` | bot name, owner, repo, live stats (drives the UI branding) |
| `POST` | `/api/pair` | `{ number }` → `{ id, state, code }` |
| `GET` | `/api/pair/:id` | poll state: `starting` → `code` → `linking` → `ready` |
| `GET` | `/api/pair/:id?consume=1` | read the session once, then the job is destroyed |
| `POST` | `/api/pair/:id/cancel` | drop the socket + wipe the dir |
| `GET` | `/api/jobs` | active jobs (needs `ADMIN_TOKEN` if set) |
| `GET` | `/health` | `{ ok, active, linked, max }` |

**Guard rails** — `MAX_ACTIVE` concurrent sockets, per-IP attempts inside a time window, single-flight so one number can't open two sockets, hard timeout on every job, and temp dirs removed on every exit path including errors. Set these in `.env`.

---

## The menu

`.menu` posts the bot block plus one tidy frame per category — small-caps unicode, real stats, nothing invented:

```
┏❐  ◈ ɴᴏᴠᴀ-ᴍᴅ ◈
┃ ᴏᴡɴᴇʀ : Nova
┃ ᴍᴏᴅᴇ : public
┃ ʜᴏꜱᴛ : Railway
┃ ꜱᴘᴇᴇᴅ : 464 ms
┃ ᴘʀᴇꜰɪx : [.]
┃ ᴄᴏʀᴇꜱ : 8
┃ ᴜᴘᴛɪᴍᴇ : 14h 39m 34s
┃ ᴠᴇʀꜱɪᴏɴ : v1.1.0
┃ ꜱᴇꜱꜱɪᴏɴꜱ : 1/1
┃ ᴜꜱᴀɢᴇ : 104.58 MB of 1.94 GB
┃ ʀᴀᴍ : [███░░░░░░░] 27%
┗❐

┏❐ 《 ɢᴇɴᴇʀᴀʟ 》 ❐
┣◆ ᴀʟɪᴠᴇ
┣◆ ᴍᴇɴᴜ
┗❐
```

| Field | Source |
|---|---|
| `ᴏᴡɴᴇʀ` · `ᴍᴏᴅᴇ` · `ᴘʀᴇꜰɪx` · `ᴠᴇʀꜱɪᴏɴ` | `.env` |
| `ʜᴏꜱᴛ` | auto-detected — see the table below |
| `ꜱᴘᴇᴇᴅ` | last measured API round-trip (`.ping` / `.speed`) |
| `ᴄᴏʀᴇꜱ` · `ᴜᴘᴛɪᴍᴇ` · `ᴜꜱᴀɢᴇ` · `ʀᴀᴍ` | `node:os` + `process.memoryUsage()` — live, never faked |
| `ꜱᴇꜱꜱɪᴏɴꜱ` | connected sockets / configured sockets |

### What `ʜᴏꜱᴛ` shows

Nothing is hardcoded — each platform injects its own env vars, so `src/lib/system.js` just reads them:

| Env var seen | Label |
|---|---|
| `RAILWAY_*` | `Railway` |
| `RENDER*` | `Render` |
| `KOYEB_*` | `Koyeb` |
| `FLY_APP_NAME` | `Fly.io` |
| `DYNO` | `Heroku` |
| `VERCEL` | `Vercel` |
| `NETLIFY` | `Netlify` |
| `CODESPACES` | `Codespaces` |
| `REPL_ID` | `Replit` |
| `P_SERVER_UUID` | `Pterodactyl` |
| `TERMUX_VERSION` | `Termux` |
| `K_SERVICE` / `GOOGLE_CLOUD_PROJECT` | `Google Cloud` |
| `WEBSITE_SITE_NAME` | `Azure` |
| `CONTAINER` / docker hostname | `Docker` |
| nothing recognised | the real `os.hostname()` (`VPS`, or e.g. `ubuntu-s-1vcpu-1gb-nyc1-01`), `Local` in a container shell |

Override any time with `HOST_NAME="My VPS · Lagos"` in `.env`.

### Banner

`docs/banner.png` is the README hero — relative paths work on GitHub, so just replace the file to re-brand.
If you'd rather host it externally (some people mirror READMEs on other sites), upload it and swap the `src`.

`.menu <category>` shows one block, `.menu all` shows everything. `npm run preview` writes the real rendering to
`docs/menu-preview.txt` so you can check the layout without a phone.

### The ✓ next to the name

With `BRAND_CARD=true`, `.menu` first sends a **contact card** — the lavender bubble with the avatar and
`Contact: NOVA-MD ✓` — then `_loading menu…_`, then the menu. Three messages, exactly like the big MD bots.

```
.vcard                  → your bot's card (name + ✓ + repo link in it)
.vcard 2348012345678    → that number as a card
.vcard 2348012345678 Name Here
.vcard <n1> <n2>        → batch, up to 5
```

**Be clear on what it is:** a vCard's `FN` field is just text we choose, so the `✓` is a character in the display
name — it is *not* Meta verification. A real verified badge is issued server-side after WhatsApp Business review;
no library can produce one, and passing a bot off as a verified brand can get the number banned. The card gives the
same *look* without touching your account status. Set `NAME_TICK=` (empty) to drop the tick entirely.

---

## Commands (299)

Full catalogue: **[docs/COMMANDS.md](docs/COMMANDS.md)** — generated from the live registry by `npm run docs`,
so the docs can never drift from the code.

| Category | Count | Highlights |
|---|---|---|
| general | 21 | `menu` `ping` `alive` `botinfo` `uptime` `date` `getsession` `profile` `report` `suggest` |
| group | 24 | `tagall` `kick` `promote` `mute` `antilink` `welcome` `goodbye` `warn` `hidetag` `pinmsg` `setdesc` |
| owner | 17 | `prefix` `sudo` `blacklist` `maintenance` `join` `leave` `setpp` `cleartmp` `mode` `reload` `broadcast` |
| dev | 10 | `color` `timestamp` `json` `regex` `jwt` `url` `bmi` `age` `rand` `entropy` — all local |
| tools | 8 | `vv` `sticker` `toimg` `qr` `getpp` `whoami` `vcard` `weather` |
| search | 11 | `wiki` `npm` `github` `define` `book` `tv` `news` `crypto` `currency` `ip` `lyrics` |
| text | 23 | `fancy` `rot13` `caesar` `morse` `sha256` `uuid` `random-string` `password` `calc` |
| textmaker | 23 | 21 styles — `circled` `squared` `gothic` `double` `cursive` `monospace` `upside` `mirrortext` `zalgo` `leet` `regional` … plus `textmaker` `unstyle` |
| converter | 29 | `cm2inch` `kg2lbs` `celsius` `dec2hex` `num2roman` `words` `datasize` `base64enc` |
| image | 25 | `blur` `brighten` `grayscale` `sepia` `pixelate` `circle` `vignette` `deepfry` `resize` |
| media | 7 | `save` `saveimg` `savevideo` `saveaudio` `savedoc` `take` `stickerinfo` |
| audio | 10 | `tomp3` `tovoice` `toaudio` `reverseaudio` `volume` `audiospeed` `trim` `waveform` `togif` `audiostatus` — needs ffmpeg |
| anime | 17 | `anime` `topanime` `randomanime` `ongoing` `manga` `character` `animequote` `animescene` `animepic` + reactions `kiss` `hug` `pat` `slap` `cuddle` `wave` `poke` `blush` |
| economy | 12 | `balance` `daily` `work` `beg` `deposit` `withdraw` `pay` `rob` `gamble` `slots` `rich` `ecoreset` |
| fun | 12 | `joke` `fact` `riddle` `ship` `rps` `coinflip` `wyr` `nhie` `horoscope` |
| games | 5 | `8ball` `truth` `dare` `dice` `quote` |
| download | 11 | `play` `ytv` `yts` `ytinfo` `tiktok` `instagram` `facebook` `twitter` `reddit` `dlstatus` |
| ai | 6 | `ai` `gpt` `gemini` `groq` `aistatus` `resetai` — bring one key |
| reactions | 18 | `laugh` `love` `fire` `wow` `sad` `angry` `clap` `salute` `think` `ok` `nope` `skull` `party` `hundred` `eyes` `pray` `react` `unreact` |
| social | 3 | `afk` `back` `birthday` — `.afk` auto-replies when someone pings you |
| faith | 3 | `verse` (20 KJV passages, offline) `prayer` `qibla` (Aladhan + geocoding) |
| misc | 4 | `short` `translate` `remind` `note` |

Loaded commands are unique by name **and alias** — `loadPlugins` records any clash instead of silently
overwriting, and `npm run test:commands` fails if a clash exists. (This check immediately found six real
clashes, including three image commands that were being hidden by later plugins.)

Two test harnesses keep it honest, both offline:

```bash
npm run doctor          # host report: ffmpeg, yt-dlp, download strategies, AI keys
npm run test:image      # 25/25 sharp ops applied to a generated image
npm run test:audio      # 33/33 — ffmpeg arg builders, time parsing, webp EXIF round-trip
npm run test:text       # 101/101 style assertions incl. exact glyph code points
npm run test:economy    # 18/18 invariants: cooldowns, fees, theft, no negative balances
npm run test:live       # hits the real APIs behind search/misc (needs internet)
npm run test:commands    # 31/31 families exercised through the real handler
npm run smoke            # every command loads + dispatches with a stub socket
```

### What needs what

| Family | Needs | Status |
|---|---|---|
| converter · text · image · media · group · general · fun · games · tools | nothing — pure local code | ✅ fully tested offline |
| `anime` / reactions | internet (nekos.best → waifu.pics fallback) | ⚠️ blocked from this sandbox, degrades with a clear message |
| `audio` family | `ffmpeg` on the host (`apt install ffmpeg`) | ⚠️ no ffmpeg here — every command replies with install instructions instead of failing silently; arg builders unit-tested |
| `media` `.take` | nothing — sharp + direct RIFF editing | ✅ verified on lossy + lossless webp |
| `weather` | internet (Open-Meteo → wttr.in fallback) | ✅ verified via wttr.in fallback |
| `ai` family | one API key (`GEMINI_API_KEY` or `GROQ_API_KEY`, both free) | ✅ request/response path verified against a mock endpoint |
| `search` family | internet, no keys (Wikipedia · npm · GitHub · dictionary · Open Library · TVmaze · Google News · CoinGecko · exchangerate · ipwho.is · lyrics.ovh) | ✅ 11/11 live-tested |
| `misc` | `short`/`translate` need internet (TinyURL · MyMemory); `remind`/`note` are local | ✅ live-tested (fr + yo translations verified) |
| `download` family | one of: API template · Piped · Invidious · yt-dlp · ytdl-core | ✅ resolver + API strategy verified; see below |

**On downloads — how the working bots actually do it.** I tested every first-party path from a datacenter IP:

| Strategy | Result from a cloud IP |
|---|---|
| `yt-dlp` binary | `Sign in to confirm you're not a bot` |
| `@distube/ytdl-core` (JS, local player solving) | `Could not parse decipher function` → no playable formats |
| Piped (4 live instances tried) | 526 / 301 / 500 / unreachable |
| Invidious (5 instances tried) | 403 / 403 / 403 / unreachable |

So when a public bot "just works", it is almost never solving YouTube itself — it is on an unflagged IP (cheap VPS
versus cloud provider), passing cookies, or **calling someone else's downloader API**. `src/lib/yt-resolver.js` tries
five strategies in order and tells you which one succeeded:

```
external api → piped → invidious → yt-dlp → ytdl-core
```

Configure whichever your host can use — one variable is enough:

```ini
# what most public bots do: they call an API, you can too
DOWNLOAD_API_URL=https://api.example.com/ytdl?url={url}&apikey={key}
DOWNLOAD_API_KEY=...
# or a keyless proxy instance that is actually alive
PIPED_URL=https://pipedapi.example
INVIDIOUS_URL=https://inv.example
# or give yt-dlp a real browser session
YTDLP_COOKIES=/app/cookies.txt
```

`DOWNLOAD_API_URL` accepts `{url}`, `{id}`, `{mode}` and `{key}` placeholders, and the response can nest the media
URL anywhere — it is dug out automatically. Verified with a mock endpoint: request → `external API` → 200 KB buffer
returned with the right title and extension. Run `.dlstatus` in chat or `npm run doctor` on the host to see which
strategies are live.

**On AI.** The plugin is provider-agnostic: Gemini and Groq (both free tiers), plus OpenAI / OpenRouter /
DeepSeek which share one wire format. First configured key wins, failures fall through to the next provider, and
memory is per chat (`AI_MEMORY_TURNS`, forget with `.resetai`). No key → it tells you exactly which var to set.

---

## Writing a command

```js
export default {
  name: 'hello',
  aliases: ['hi'],
  category: 'general',
  description: 'Says hello',
  groupOnly: false,
  adminOnly: false,
  ownerOnly: false,
  botAdminNeeded: false,
  cooldownMs: 1500,          // all guards optional
  async run({ reply, argsText, pushName }) {
    await reply({ text: `👋 Hello ${argsText || pushName}!` });
  },

  // optional: fires on every NON-command message (antilink, AI replies, logging)
  async onMessage(ctx, plugin) {},
};
```

| `run(ctx)` field | meaning |
|---|---|
| `sock` | raw Baileys socket — `sendMessage`, `groupParticipantsUpdate`, `groupSettingUpdate`… |
| `msg` / `key` | raw message and its key |
| `message` | content with ephemeral / view-once wrappers peeled off |
| `jid` · `isGroup` · `sender` · `senderJid` · `pushName` | who and where |
| `text` · `args` · `argsText` · `command` · `prefix` | the parsed command |
| `isOwner` · `isAdmin` · `isBotAdmin` · `groupMetadata` | permissions |
| `config` · `store` · `logger` · `runtime` · `registry` | app context |
| `reply(content, opts?)` · `react(emoji)` | send helpers with `quoted` preset |

`.reload` in chat (or `npm run dev`, which watches files) picks up changes without re-pairing.

---

## Sessions

| `SESSION_BACKEND` | Where it lives | Use when |
|---|---|---|
| `file` *(default)* | `sessions/creds.json` | VPS / Docker with a volume |
| `session` | `SESSION_ID` env var, decoded to `sessions/creds.json` at boot | Render, Railway, Koyeb, any ephemeral filesystem |
| `supabase` | Postgres — creds **and** Signal keys | you redeploy a lot or want multi-tenant later |

Leaving `SESSION_BACKEND` unset is smart-default mode: if `SESSION_ID` is set and no local `creds.json` exists, it uses the string; otherwise files win.

Supabase needs one extra dependency and one migration:

```bash
npm i @supabase/supabase-js
# run supabase/0001_whatsapp_sessions.sql in the Supabase SQL editor
```

Both tables have RLS enabled with **no policies** — only the service-role key (server-side only) can read them.

---

## Deployment

The bot needs a **long-running process**. WhatsApp holds a WebSocket open; serverless functions get frozen mid-handshake.

| Target | Bot | Pairing site |
|---|---|---|
| VPS + pm2 | ✅ `pm2 start ecosystem.config.cjs` + `apt install yt-dlp ffmpeg` | ✅ same box |
| Docker | ✅ image ships yt-dlp + ffmpeg | ✅ |
| Railway / Render / Koyeb | ✅ set `SESSION_ID`, enable `/health` pinger | ✅ (set `PORT`) |
| **Vercel / Netlify** | ❌ serverless can't hold the socket | ⚠️ needs a persistent host for pairing — use it for a dashboard instead |

Two processes, one session each. Never point the same `sessions/` dir at two hosts.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `connection closed · 401` | device unlinked or a second process used the session. Restart and re-pair. |
| Code issued but never links | sockets reused, or `requestPairingCode` called before the handshake. Ours fires off the `qr` event. |
| Group commands silently do nothing | bot isn't a group admin (`botAdminNeeded`), or admin check needs `groupMetadata`, not the JID prefix. |
| `Missing SESSION_ID` on Render | env var not set on the service, or the string was truncated when pasted. |
| Temp dirs piling up in `web/tmp` | a crash between export and cleanup — safe to delete; the sweeper clears them every minute. |

---

## Roadmap

- [x] plugin loader · guards · QR / pairing code / session-string login
- [x] clean small-caps menu with live system stats · 32 commands
- [x] branded contact card (`.vcard`, `BRAND_CARD`) with configurable name tick
- [x] pairing website with isolated sessions + one-time export
- [x] sticker maker (images via `sharp`)
- [x] welcome / goodbye group engine (persisted, template tokens)
- [x] anime category on free APIs with provider fallback
- [x] converter · image · media · text-cipher · fun · info families (156 commands)
- [x] auto-generated command catalogue (`npm run docs`)
- [x] downloads via yt-dlp (play / ytv / yts / tiktok / ig / fb / x) with cookie + proxy support
- [x] AI family, provider-agnostic (Gemini · Groq · OpenAI · OpenRouter · DeepSeek)
- [x] keyless weather with a two-provider fallback
- [ ] video stickers + animated webp (needs `ffmpeg`)
- [ ] AI image generation (`imagine`) — needs an image-capable key
- [ ] antidelete / anticall / antispam engines
- [ ] economy + leveling subsystem (SQLite or Supabase)
- [ ] Supabase-backed group settings (multi-tenant)
- [ ] small dashboard on Vercel reading Supabase

---

## Security

A `SESSION_ID` is a full login to that WhatsApp account — treat it like a password. Never commit `.env`,
`sessions/`, or `web/tmp/`. Rotate by unlinking the device in WhatsApp. This project is for your own
accounts and legitimate automation; bulk messaging and spam will get numbers banned.

MIT licensed.
