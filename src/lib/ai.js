/**
 * Provider-agnostic chat completion.
 *
 * Devs keep these working by (a) not hardcoding one vendor and (b) putting the
 * key in env, never in the repo. Gemini and Groq both have usable free tiers;
 * OpenAI/OpenRouter/DeepSeek share the same wire format, so they are one branch.
 */
const TIMEOUT = Number(process.env.AI_TIMEOUT_MS || 45_000);

const memory = new Map(); // jid → [{ role, content }]
const MEMORY_TURNS = Number(process.env.AI_MEMORY_TURNS || 12);
const MEMORY_TTL = Number(process.env.AI_MEMORY_TTL_MS || 30 * 60 * 1000);

export function recall(jid) {
  const hit = memory.get(jid);
  if (!hit) return [];
  if (Date.now() - hit.at > MEMORY_TTL) { memory.delete(jid); return []; }
  return hit.turns;
}

export function remember(jid, role, content) {
  const turns = recall(jid);
  turns.push({ role, content });
  memory.set(jid, { turns: turns.slice(-MEMORY_TURNS * 2), at: Date.now() });
}

export function forget(jid) {
  memory.delete(jid);
}

export const memorySize = () => memory.size;

/** Which providers have a key configured, in preference order. */
export function availableProviders() {
  const list = [];
  const env = process.env;
  if (env.GEMINI_API_KEY || env.GOOGLE_API_KEY) list.push('gemini');
  if (env.GROQ_API_KEY) list.push('groq');
  if (env.OPENAI_API_KEY) list.push('openai');
  if (env.OPENROUTER_API_KEY) list.push('openrouter');
  if (env.DEEPSEEK_API_KEY) list.push('deepseek');
  const forced = (env.AI_PROVIDER || '').toLowerCase();
  return forced ? list.filter((p) => p === forced) : list;
}

const OPENAI_COMPATIBLE = {
  groq: { base: 'https://api.groq.com/openai/v1', key: 'GROQ_API_KEY', model: 'llama-3.3-70b-versatile' },
  openai: { base: 'https://api.openai.com/v1', key: 'OPENAI_API_KEY', model: 'gpt-4o-mini' },
  openrouter: { base: 'https://openrouter.ai/api/v1', key: 'OPENROUTER_API_KEY', model: 'meta-llama/llama-3.1-8b-instruct' },
  deepseek: { base: 'https://api.deepseek.com/v1', key: 'DEEPSEEK_API_KEY', model: 'deepseek-chat' },
};

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function postJson(url, body, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { throw new Error(`non-JSON response (${res.status})`); }
    if (!res.ok) {
      const msg = json?.error?.message || json?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(history, prompt) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
  const contents = [
    ...history.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] })),
    { role: 'user', parts: [{ text: prompt }] },
  ];
  const json = await postJson(
    `${base}/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      contents,
      systemInstruction: process.env.AI_SYSTEM_PROMPT ? { parts: [{ text: process.env.AI_SYSTEM_PROMPT }] } : undefined,
      generationConfig: { maxOutputTokens: Number(process.env.AI_MAX_TOKENS || 512), temperature: 0.8 },
    }
  );
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text).filter(Boolean).join('\n').trim();
  if (!text) throw new Error('empty response from Gemini');
  return { text, provider: `gemini/${GEMINI_MODEL}` };
}

async function callOpenAiCompatible(provider, history, prompt) {
  const cfg = OPENAI_COMPATIBLE[provider];
  const key = process.env[cfg.key];
  const base = (provider === 'openai' && process.env.OPENAI_BASE_URL) || (provider === 'groq' && process.env.GROQ_BASE_URL) || cfg.base;
  const model = (provider === 'openai' && process.env.OPENAI_MODEL)
    || (provider === 'groq' && process.env.GROQ_MODEL)
    || cfg.model;

  const json = await postJson(
    `${base}/chat/completions`,
    {
      model,
      messages: [
        ...(process.env.AI_SYSTEM_PROMPT ? [{ role: 'system', content: process.env.AI_SYSTEM_PROMPT }] : []),
        ...history.map((t) => ({ role: t.role, content: t.content })),
        { role: 'user', content: prompt },
      ],
      max_tokens: Number(process.env.AI_MAX_TOKENS || 512),
      temperature: 0.8,
    },
    { authorization: `Bearer ${key}` }
  );
  const text = json?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('empty response');
  return { text, provider: `${provider}/${model}` };
}

/** Try every configured provider in order; throw a readable error if all fail. */
export async function ask(jid, prompt) {
  const providers = availableProviders();
  if (!providers.length) {
    throw new Error(
      'No AI key configured. Add one to .env:\n• GEMINI_API_KEY (free tier)\n• GROQ_API_KEY (free tier)\n• OPENAI_API_KEY / OPENROUTER_API_KEY / DEEPSEEK_API_KEY'
    );
  }
  const history = recall(jid);
  const errors = [];
  for (const provider of providers) {
    try {
      const out = provider === 'gemini'
        ? await callGemini(history, prompt)
        : await callOpenAiCompatible(provider, history, prompt);
      remember(jid, 'user', prompt);
      remember(jid, 'assistant', out.text);
      return out;
    } catch (err) {
      errors.push(`${provider}: ${err.message}`);
    }
  }
  throw new Error(`All AI providers failed —\n${errors.join('\n')}`);
}
