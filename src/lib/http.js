/** Small fetch helper: timeout + JSON + graceful failure. No deps. */
export async function fetchJson(url, { timeout = 12_000, headers = {}, method = 'GET', body = null } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      body: body == null ? undefined : body,
      signal: ctrl.signal,
      headers: { 'user-agent': 'nova-md/1.2 (+https://github.com)', accept: 'application/json', ...headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Try providers in order, return the first that yields a value. */
export async function firstOf(providers) {
  const errors = [];
  for (const p of providers) {
    try {
      const value = await p();
      if (value) return value;
    } catch (err) {
      errors.push(err.message);
    }
  }
  throw new Error(errors.join(' | ') || 'no provider responded');
}

export async function fetchBuffer(url, { timeout = 20_000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'nova-md/1.2' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}
