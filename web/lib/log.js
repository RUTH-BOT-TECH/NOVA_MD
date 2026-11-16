/**
 * Tiny JSON-lines logger with the shape Baileys expects (trace/debug/info/warn/
 * error/fatal/child). No dependency, so `web/` installs nothing it does not use
 * for logging.
 */

const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };
const current = LEVELS[(process.env.LOG_LEVEL || 'info').toLowerCase()] ?? LEVELS.info;
const silent = process.env.LOG_SILENT === '1';

const emit = (level, bindings, args) => {
  if (silent || LEVELS[level] < current) return;
  const [first, ...rest] = args;
  const entry = { level, time: Date.now(), ...bindings };
  if (first instanceof Error) {
    entry.err = { message: first.message, stack: first.stack?.split('\n').slice(0, 4).join(' | ') };
    if (rest.length) entry.msg = rest.map(String).join(' ');
  } else {
    entry.msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  }
  process.stdout.write(`${JSON.stringify(entry)}\n`);
};

const make = (bindings = {}) => {
  const logger = {};
  for (const level of Object.keys(LEVELS)) {
    logger[level] = (...args) => emit(level, bindings, args);
  }
  logger.child = (extra = {}) => make({ ...bindings, ...extra });
  return logger;
};

export const logger = make();
/** Baileys logs a lot at info/debug; keep it quiet unless asked. */
export const baileysLogger = make({ mod: 'baileys' });
if ((process.env.BAILEYS_LOG_LEVEL || 'silent') === 'silent') {
  for (const level of ['trace', 'debug', 'info', 'warn']) baileysLogger[level] = () => {};
}

export default logger;
