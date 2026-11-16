/**
 * Deploy manifest checks.
 *
 * These cannot press a deploy button, but they can catch the mistakes that make
 * a one-click deploy fail five minutes in: a start command that does not exist,
 * a port that disagrees with the Dockerfile, a service with no health check, or
 * an env var the app reads but the manifest never offers.
 *
 * Run: npm run test:deploy
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { parse as parseToml } from 'smol-toml';

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`✓ ${label}`); }
  else { fail++; console.log(`✗ ${label} ${detail}`); }
};

const read = (f) => fs.readFile(f, 'utf8');
const json = async (f) => JSON.parse(await read(f));
const yaml = async (f) => YAML.parse(await read(f));

const pkg = await json('package.json');
const envExample = await read('.env.example');
const envNames = new Set([...envExample.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]));
const hasEnv = (name) => envNames.has(name);

/* ── every manifest is syntactically valid ─────────────────────────── */
for (const f of ['render.yaml', 'docker-compose.yml']) {
  try { await yaml(f); ok(`${f} parses`, true); }
  catch (err) { ok(`${f} parses`, false, err.message.slice(0, 80)); }
}
for (const f of ['fly.toml', 'nixpacks.toml', 'Procfile']) {
  try {
    if (f.endsWith('.toml')) parseToml(await read(f));
    ok(`${f} is well-formed`, true);
  } catch (err) { ok(`${f} is well-formed`, false, err.message.slice(0, 80)); }
}
for (const f of ['railway.json', 'app.json', 'package.json']) {
  try { await json(f); ok(`${f} parses`, true); }
  catch (err) { ok(`${f} parses`, false, err.message.slice(0, 80)); }
}

/* ── Render: two services, real start commands, prompts for secrets ── */
const render = await yaml('render.yaml');
const services = render.services || [];
ok('render.yaml defines the bot and the pairer', services.length === 2, String(services.length));
const byName = Object.fromEntries(services.map((s) => [s.name, s]));
ok('render.yaml bot service is named nova-md', Boolean(byName['nova-md']));
ok('render.yaml pairer service is named nova-pair', Boolean(byName['nova-pair']));

for (const svc of services) {
  // either `node <file>` from the repo root, or `npm start` inside a rootDir
  if ((svc.startCommand || '').startsWith('npm ')) {
    const dir = svc.rootDir || '.';
    const sub = JSON.parse(await read(path.join(dir, 'package.json')));
    const inner = (sub.scripts?.start || '').match(/node (\S+)/)?.[1];
    const okFile = inner ? await fs.access(path.join(dir, inner)).then(() => true, () => false) : false;
    ok(`${svc.name} startCommand resolves inside ${dir}/`, okFile, `${svc.startCommand} → ${inner}`);
  } else {
    const script = (svc.startCommand || '').match(/^node (\S+)/)?.[1];
    const exists = script ? await fs.access(script).then(() => true, () => false) : false;
    ok(`${svc.name} startCommand points at a real file`, exists, svc.startCommand);
  }
  ok(`${svc.name} declares a health check`, Boolean(svc.healthCheckPath), svc.healthCheckPath || 'none');
  ok(`${svc.name} installs dependencies deterministically`, /npm (ci|install)/.test(svc.buildCommand || ''), svc.buildCommand);
  const keys = (svc.envVars || []).map((v) => v.key);
  ok(`${svc.name} only names real env vars`, keys.every((k) => hasEnv(k)), keys.filter((k) => !hasEnv(k)).join(', '));
  const leaky = (svc.envVars || []).filter((v) => /SESSION_ID|API_KEY|TOKEN|SECRET/.test(v.key) && v.value);
  ok(`${svc.name} never hardcodes a secret`, leaky.length === 0, leaky.map((v) => v.key).join(', '));
}
const botEnv = (byName['nova-md'].envVars || []);
ok('render.yaml asks for SESSION_ID instead of inventing one', botEnv.some((v) => v.key === 'SESSION_ID' && v.sync === false));
const pairSvc = services.find((s) => s.name === 'nova-pair');
ok('render.yaml points the pair service at web/ (no build config needed)', pairSvc?.rootDir === 'web', JSON.stringify(pairSvc?.rootDir));
ok('render.yaml pair service just runs npm start', pairSvc?.startCommand === 'npm start', pairSvc?.startCommand);
ok('render.yaml pair service is free-tier', pairSvc?.plan === 'free', pairSvc?.plan);
ok('render.yaml pair service is single-use by default', (pairSvc?.envVars || []).some((v) => v.key === 'PAIR_ONCE' && String(v.value) === '1'));
ok('render.yaml no longer sets WEB_PORT on the pairer', !(pairSvc?.envVars || []).some((v) => v.key === 'WEB_PORT'));
ok('render.yaml asks for OWNER_NUMBER', botEnv.some((v) => v.key === 'OWNER_NUMBER' && v.sync === false));

/* ── Railway ──────────────────────────────────────────────────────── */
const railway = await json('railway.json');
ok('railway.json starts the bot', railway.deploy?.startCommand === `node ${(pkg.scripts.start || '').split(' ').slice(1).join(' ')}`, railway.deploy?.startCommand);
ok('railway.json restarts on failure', railway.deploy?.restartPolicyType === 'ON_FAILURE');
ok('railway.json checks /health', railway.deploy?.healthcheckPath === '/health');

const nix = await read('nixpacks.toml');
ok('nixpacks.toml installs ffmpeg and yt-dlp', /ffmpeg/.test(nix) && /yt-dlp/.test(nix));
ok('nixpacks.toml starts the bot', /node src\/index\.js/.test(nix));

/* ── web/ is a standalone app (one-field deploys) ─────────────────── */
const webPkg = await json('web/package.json');
ok('web/ has its own package.json', webPkg.name === 'nova-md-pair-site');
ok('web/ starts itself with npm start', webPkg.scripts?.start === 'node server.js', webPkg.scripts?.start);
ok('web/ declares the deps it needs', Boolean(webPkg.dependencies?.['@whiskeysockets/baileys']) && Boolean(webPkg.dependencies?.express));
const webEntries = await fs.readdir('web', { recursive: true, withFileTypes: true });
const webSources = webEntries
  .filter((e) => e.isFile() && /\.m?js$/.test(e.name))
  .map((e) => path.relative('web', path.join(e.parentPath ?? e.path, e.name)))
  .filter((p) => !p.startsWith('node_modules'));
let escapes = [];
for (const f of webSources) {
  const src = await read(path.join('web', f));
  if (/from ['"]\.\.\/src|from ['"]\.\.\/\.\.\/src/.test(src)) escapes.push(f);
}
ok('nothing in web/ imports from outside web/', escapes.length === 0, escapes.join(', '));
ok('web/ carries its own config and logger', await fs.access('web/lib/config.js').then(() => true, () => false) && await fs.access('web/lib/log.js').then(() => true, () => false));

/* ── the pairing service's own Railway config ─────────────────────── */
const webRail = await json('web/railway.json');
const webStart = (webRail.deploy?.startCommand || '').match(/^node (\S+)/)?.[1];
ok('web/railway.json starts the pairing site', webStart === 'web/server.js', webRail.deploy?.startCommand);
ok('web/railway.json points its health check at /health', webRail.deploy?.healthcheckPath === '/health');
ok('web/railway.json restarts on failure', webRail.deploy?.restartPolicyType === 'ON_FAILURE');
ok('web/railway.json never hardcodes PORT (Railway injects it)', !JSON.stringify(webRail).includes('PORT'));
ok('the two Railway configs start different things',
  railway.deploy?.startCommand !== webRail.deploy?.startCommand,
  `${railway.deploy?.startCommand} vs ${webRail.deploy?.startCommand}`);
const serverJs = await read('web/server.js');
ok('web/server.js reads the injected PORT', /process\.env\.PORT/.test(serverJs));
ok('web/server.js binds 0.0.0.0', /0\.0\.0\.0/.test(serverJs));

/* ── the pairing link the bot advertises ──────────────────────────── */
ok('PAIR_URL is documented in .env.example', hasEnv('PAIR_URL'));
ok('config exposes pairUrl for the menu', /pairUrl/.test(await read('src/config.js')));
ok('the menu prints the pairing link when set', /PAIR_URL|pairUrl/.test(await read('plugins/general/menu.js')));
const dep = await read('docs/DEPLOY.md');
ok('DEPLOY.md explains the Root Directory = web step', /Root Directory/.test(dep) && /web\n|`web`/.test(dep));
ok('DEPLOY.md marks config-as-code as legacy', /legacy|deprecated/i.test(dep));

/* ── Procfile ─────────────────────────────────────────────────────── */
const procfile = await read('Procfile');
const procs = procfile.trim().split('\n').map((line) => line.split(/\s*:\s*/));
ok('Procfile declares worker and web', procs.length === 2 && procs.some(([k]) => k === 'worker') && procs.some(([k]) => k === 'web'));
for (const [kind, cmd] of procs) {
  const target = cmd.replace(/^node /, '');
  ok(`Procfile ${kind} runs a real file`, await fs.access(target).then(() => true, () => false), cmd);
}

/* ── Heroku app.json ──────────────────────────────────────────────── */
const app = await json('app.json');
ok('app.json names the repo', String(app.repository).includes('NOVA_MD'), app.repository);
ok('app.json requires the owner number', app.env?.OWNER_NUMBER?.required === true);
ok('app.json asks for SESSION_ID without forcing it', app.env?.SESSION_ID?.required === false);
ok('app.json installs an ffmpeg buildpack', (app.buildpacks || []).some((b) => /ffmpeg/.test(b.url)));
ok('app.json runs a worker (a bot needs no web dyno)', Boolean(app.formation?.worker), JSON.stringify(app.formation));
ok('app.json env names are all real', Object.keys(app.env || {}).every(hasEnv), Object.keys(app.env || {}).filter((k) => !hasEnv(k)).join(', '));

/* ── Docker ───────────────────────────────────────────────────────── */
const dockerfile = await read('Dockerfile');
const dockerPort = Number(dockerfile.match(/ENV PORT=(\d+)/)?.[1]);
ok('Dockerfile exposes a port for the health server', Number.isInteger(dockerPort) && dockerPort > 0, String(dockerPort));
ok('Dockerfile ships a HEALTHCHECK', /HEALTHCHECK/.test(dockerfile));
ok('Dockerfile health check hits /health', /\/health/.test(dockerfile));
ok('Dockerfile installs ffmpeg', /ffmpeg/.test(dockerfile));
ok('Dockerfile starts the bot', /CMD \["node", "src\/index\.js"\]/.test(dockerfile));

const fly = parseToml(await read('fly.toml'));
ok('fly.toml internal_port matches the Dockerfile PORT', Number(fly.http_service?.internal_port) === dockerPort, `${fly.http_service?.internal_port} vs ${dockerPort}`);
ok('fly.toml uses the Dockerfile', fly.build?.dockerfile === 'Dockerfile');
const mounts = [].concat(fly.mounts || []);
ok('fly.toml has a volume for sessions', mounts.some((m) => m?.destination === '/data'), JSON.stringify(mounts));
const checks = [].concat(fly.http_service?.checks || []);
ok('fly.toml checks /health', checks.some((c) => c?.path === '/health'), JSON.stringify(checks));

const compose = await yaml('docker-compose.yml');
const cServices = Object.keys(compose.services || {});
ok('compose runs bot and pairer', cServices.includes('nova-md') && cServices.includes('nova-pair'), cServices.join(', '));
ok('compose maps the pairer port', JSON.stringify(compose.services['nova-pair'].ports).includes('3000'));
ok('compose bot publishes the health port', JSON.stringify(compose.services['nova-md'].ports).includes('8080'));
ok('compose pairer runs web/server.js', JSON.stringify(compose.services['nova-pair'].command).includes('web/server.js'));

/* ── README buttons must point somewhere real ─────────────────────── */
const readme = await read('README.md');
for (const [name, needle] of [
  ['Render', 'render.com/deploy?repo=https://github.com/RUTH-BOT-TECH/NOVA_MD'],
  ['Railway', 'railway.com/new'],
  ['Heroku', 'heroku.com/deploy?template=https://github.com/RUTH-BOT-TECH/NOVA_MD'],
]) {
  ok(`README has a ${name} deploy button`, readme.includes(needle), needle);
}
ok('README deploy buttons are badges, not markdown links', !/\[![^\]]*\]\([^)]*\)/.test(readme));
ok('README points to the deploy guide', readme.includes('docs/DEPLOY.md'));

/* ── pairing docs reachable from the repo root ────────────────────── */
const quick = await read('PAIRING.md');
ok('PAIRING.md exists at the repo root', quick.length > 500, String(quick.length));
ok('README points people at PAIRING.md', readme.includes('blob/main/PAIRING.md'));
ok('PAIRING.md maps every file in web/', ['server.js', 'index.html', 'pairer.js', 'session.js', 'railway.json'].every((f) => quick.includes(f)));
ok('PAIRING.md warns the config-file route is deprecated', /deprecated/i.test(quick) && /Add File Path|config/i.test(quick));
ok('PAIRING.md makes Root Directory = web the only Railway step', /Root Directory[\s\S]{0,80}web/.test(quick) && /standalone app|self-contained/i.test(quick));
ok('PAIRING.md links the deep dive', quick.includes('docs/PAIRING.md'));
ok('PAIRING.md has a one-time deploy section', /One-time deploy/i.test(quick) && quick.includes('id="one-time"'));
ok('PAIRING.md explains PAIR_ONCE', /PAIR_ONCE/.test(quick) && /single-use/i.test(quick));
ok('PAIRING.md anchors the Railway steps', quick.includes('id="railway"'));
ok('the README one-time badges point at real anchors', readme.includes('PAIRING.md#railway') && readme.includes('PAIRING.md#one-time'));
ok('the README offers a one-click pair-site deploy', readme.includes('render.com/deploy?repo=https://github.com/RUTH-BOT-TECH/NOVA_MD'));
ok('PAIR_ONCE is documented in .env.example', hasEnv('PAIR_ONCE'));
ok('PAIR_FAKE is documented in .env.example', hasEnv('PAIR_FAKE'));
const webReadme = await read('web/README.md');
ok('web/README.md explains the folder', /pairing/i.test(webReadme) && webReadme.includes('server.js'));
ok('web/README.md links back to the root quickstart', webReadme.includes('../PAIRING.md'));
const deep = await read('docs/PAIRING.md');
ok('docs/PAIRING.md links back to the quickstart', deep.includes('../PAIRING.md'));

/* ── the guide documents every manifest file ──────────────────────── */
const guide = await read('docs/DEPLOY.md');
for (const f of ['render.yaml', 'railway.json', 'nixpacks.toml', 'Procfile', 'app.json', 'fly.toml', 'Dockerfile', 'docker-compose.yml']) {
  ok(`DEPLOY.md documents ${f}`, guide.includes(f));
}
ok('DEPLOY.md lists PAIR_ONCE', /PAIR_ONCE/.test(guide));
ok('DEPLOY.md is honest about what is untested', /not been pressed|cannot check|unverified|not.{0,20}verified/i.test(guide));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
