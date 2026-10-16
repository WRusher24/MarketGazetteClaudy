import { query } from './db';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

function modelList(): string[] {
  const configured = process.env.GEMINI_MODEL;
  const defaults = ['gemini-3.8-flash', 'gemini-2.5-flash'];
  return configured ? [configured, ...defaults.filter((m) => m !== configured)] : defaults;
}

/** Calls Gemini and returns parsed JSON. Tries fallback models if one is unavailable. */
export async function geminiJson<T>(prompt: string, temperature = 0.3): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  let lastError = 'Gemini request failed';
  for (const model of modelList()) {
    const res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(50000),
    });
    if (!res.ok) {
      lastError = `Gemini ${model} responded ${res.status}`;
      if (res.status === 404 || res.status === 400 || res.status === 503) continue;
      throw new Error(lastError);
    }
    const json = await res.json();
    const parts: { text?: string }[] = json?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? '').join('').trim();
    if (!text) {
      lastError = `Gemini ${model} returned an empty response`;
      continue;
    }
    const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(unfenced) as T;
    } catch {
      lastError = `Gemini ${model} returned malformed JSON`;
    }
  }
  throw new Error(lastError);
}

/** Read-through cache for AI output, stored in Neon. */
export async function cachedAi<T>(key: string, ttlSeconds: number, produce: () => Promise<T>): Promise<T> {
  try {
    const rows = await query<{ payload: T }>(
      `SELECT payload FROM ai_cache WHERE cache_key = $1 AND created_at > now() - make_interval(secs => $2::double precision)`,
      [key, ttlSeconds],
    );
    if (rows[0]) return rows[0].payload;
  } catch {
    /* cache miss */
  }
  const fresh = await produce();
  try {
    await query(
      `INSERT INTO ai_cache (cache_key, payload) VALUES ($1, $2::jsonb)
       ON CONFLICT (cache_key) DO UPDATE SET payload = EXCLUDED.payload, created_at = now()`,
      [key, JSON.stringify(fresh)],
    );
  } catch {
    /* best-effort */
  }
  return fresh;
}
