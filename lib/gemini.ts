import { query } from './db';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

// Stay under the route's maxDuration (60s) so a slow first model still leaves room for the fallback.
const TOTAL_BUDGET_MS = 55_000;
const PER_ATTEMPT_MS = 30_000;

function modelList(): string[] {
  const configured = process.env.GEMINI_MODEL;
  const defaults = ['gemini-3.8-flash'];
  return configured ? [configured, ...defaults.filter((m) => m !== configured)] : defaults;
}

/** Pulls Google's human-readable error message out of a failed response. */
async function errorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const msg = body?.error?.message;
    return typeof msg === 'string' ? msg.slice(0, 300) : '';
  } catch {
    return '';
  }
}

/** Calls Gemini and returns parsed JSON. Tries fallback models if one is unavailable or rate limited. */
export async function geminiJson<T>(prompt: string, temperature = 0.3): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const errors: string[] = [];

  for (const model of modelList()) {
    const remaining = deadline - Date.now();
    if (remaining < 3000) break;

    let res: Response;
    try {
      res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(Math.min(PER_ATTEMPT_MS, remaining)),
      });
    } catch (e) {
      errors.push(`Gemini ${model} did not respond in time (${e instanceof Error ? e.name : 'network error'})`);
      continue;
    }

    if (!res.ok) {
      const detail = await errorDetail(res);
      const message = `Gemini ${model} responded ${res.status}${detail ? `: ${detail}` : ''}`;
      errors.push(message);

      // A rejected key will fail on every model, so stop and say so instead of trying the next one.
      const badKey = res.status === 401 || res.status === 403 || /api key/i.test(detail);
      if (badKey) throw new Error(`Gemini rejected GEMINI_API_KEY. ${message}`);

      // Model missing, bad request for this model, quota/rate limit (per-model), or server trouble: try the next model.
      if ([400, 404, 429, 500, 503].includes(res.status)) continue;
      throw new Error(errors.join(' | '));
    }

    const json = await res.json();
    const parts: { text?: string }[] = json?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.map((p) => p.text ?? '').join('').trim();
    if (!text) {
      const reason = json?.promptFeedback?.blockReason ?? json?.candidates?.[0]?.finishReason;
      errors.push(`Gemini ${model} returned an empty response${reason ? ` (${reason})` : ''}`);
      continue;
    }
    const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
      return JSON.parse(unfenced) as T;
    } catch {
      errors.push(`Gemini ${model} returned malformed JSON`);
    }
  }
  throw new Error(errors.join(' | ') || 'Gemini request failed');
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
