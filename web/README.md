# web/ — the pairing site

Four files, nothing hidden:

| file | what it does |
|---|---|
| `server.js` | Express server: `POST /api/pair`, `GET /api/pair/:id`, `POST /api/pair/:id/code`, `POST /api/pair/:id/cancel`, `GET /health`, `GET /api/config` |
| `public/index.html` | the page users open — enter a number, see the code, copy the SESSION_ID |
| `lib/pairer.js` | the engine: Baileys socket, code request, job states, 515 reconnect, session export |
| `lib/session.js` | the session string (`PREFIX~base64(creds)`) plus the in-memory auth state |
| `railway.json` | Railway config for this service — start command and `/health` check |

## Run it

```bash
npm run web                 # http://localhost:3000
PAIR_FAKE=1 npm run web     # test mode: walks the states, no phone needed
```

## Deploy it

- **Railway:** see **[../PAIRING.md](../PAIRING.md)** — second service from the
  same repo, config path `/web/railway.json`, do not set `PORT`.
- **Render:** `../render.yaml` already defines a `nova-pair` service.
- **Docker:** `docker compose up` runs it alongside the bot.

## Tests

```bash
npm run test:pairing        # 35 assertions, includes the bot's own session parser
```

API details, job states and env vars: **[../docs/PAIRING.md](../docs/PAIRING.md)**.
