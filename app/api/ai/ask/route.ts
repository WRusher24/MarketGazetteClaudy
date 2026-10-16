import { parseAskAnswer, buildAskSources, sourcesPrompt, type AskAnswer } from '@/lib/ask';
import { geminiJson } from '@/lib/gemini';
import { finnhubEarnings, finnhubRecommendations } from '@/lib/finnhub';
import { cleanSymbol, fail, ok, readJson } from '@/lib/http';
import { getNews } from '@/lib/news';
import { getStock } from '@/lib/stock';

export const maxDuration = 60;

const MAX_QUESTION = 500;
const MAX_HISTORY = 6;
const MAX_TURN = 1000;

interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

function cleanHistory(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-MAX_HISTORY)
    .map((t) => ({ role: (t as Turn)?.role, text: typeof (t as Turn)?.text === 'string' ? (t as Turn).text.slice(0, MAX_TURN) : '' }))
    .filter((t): t is Turn => (t.role === 'user' || t.role === 'assistant') && t.text.trim().length > 0);
}

/** Answers a question about one stock from live data, citing the figures and headlines used. Not cached: each question is different. */
export async function POST(req: Request) {
  let body: { symbol?: unknown; question?: unknown; history?: unknown };
  try {
    body = await readJson(req);
  } catch (e) {
    return fail(e, 400);
  }
  const symbol = cleanSymbol(typeof body.symbol === 'string' ? body.symbol : null);
  if (!symbol) return fail('Invalid symbol', 400);
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) return fail('Ask a question first', 400);
  if (question.length > MAX_QUESTION) return fail(`Questions are limited to ${MAX_QUESTION} characters`, 400);
  const history = cleanHistory(body.history);

  try {
    const [stock, earnings, recs, news] = await Promise.allSettled([
      getStock(symbol),
      finnhubEarnings(symbol),
      finnhubRecommendations(symbol),
      getNews('ticker', [symbol], 12),
    ]);
    const failed = (name: string, r: PromiseSettledResult<unknown>) => (r.status === 'rejected' ? [name] : []);
    const missing = [
      ...failed('live quote and profile', stock),
      ...failed('earnings', earnings),
      ...failed('analyst ratings', recs),
      ...failed('news', news),
    ];
    const earningsRows = earnings.status === 'fulfilled' && Array.isArray(earnings.value) ? earnings.value : [];
    const recRows = recs.status === 'fulfilled' && Array.isArray(recs.value) ? recs.value : [];
    const latestRec = [...recRows].sort((a, b) => String(b?.period).localeCompare(String(a?.period)))[0] ?? null;
    const { sources } = buildAskSources({
      stock: stock.status === 'fulfilled' ? stock.value : null,
      lastEarnings: earningsRows[0] ?? null,
      ratings: latestRec,
      news: news.status === 'fulfilled' ? news.value : [],
      missing,
    });

    const conversation = history.length
      ? history.map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.text}`).join('\n')
      : 'none';
    const raw = await geminiJson<{ answer?: unknown; cite?: unknown }>(
      `You are a careful research assistant for the stock ${symbol}. Answer the user's question using ONLY the numbered sources below.\n` +
        `Cite the sources you rely on inline in square brackets, for example [F1] or [H3]. Never cite a source you did not use.\n` +
        `If the sources do not answer the question, say so plainly. Never invent prices, figures, dates or events. Keep the answer under 150 words.\n\n` +
        `Sources:\n${sourcesPrompt(sources, missing) || 'none available'}\n\n` +
        `Conversation so far:\n${conversation}\n\n` +
        `Question: ${question}\n\n` +
        `Return JSON exactly in this shape: {"answer": "your answer with inline citations", "cite": ["source ids you used"]}`,
      0.2,
    );
    const result: AskAnswer & { missing: string[] } = { ...parseAskAnswer(raw, sources), missing };
    return ok(result);
  } catch (e) {
    console.error(`[api/ai/ask] ${symbol}:`, e);
    return fail(e, 502);
  }
}
