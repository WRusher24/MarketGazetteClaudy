import { cachedAi, geminiJson } from './gemini';
import { finnhubEarnings, finnhubRecommendations } from './finnhub';
import { getNews } from './news';
import { getStock } from './stock';
import { truncate } from './text';
import type { AnalystReport, ArticleSummary, SentimentLabel } from './types';

const label = (v: unknown): SentimentLabel => {
  const s = String(v ?? '').toLowerCase();
  return s.startsWith('bull') ? 'Bullish' : s.startsWith('bear') ? 'Bearish' : 'Neutral';
};
const list = (v: unknown, max = 8): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, max) : [];
const text = (v: unknown): string => (typeof v === 'string' ? v : '');

export interface SummaryInput {
  id: string;
  headline: string;
  summary: string;
  content: string;
  related: string[];
  source: string;
}

export function summarizeArticle(input: SummaryInput): Promise<ArticleSummary> {
  return cachedAi<ArticleSummary>(`summary:${input.id}`, 86400, async () => {
    const body = truncate(input.content || input.summary, 7000);
    const raw = await geminiJson<Record<string, any>>(
      `You are a financial news analyst. Analyze the article below for an investor.\n` +
        `Headline: ${input.headline}\nSource: ${input.source}\nRelated tickers: ${input.related.join(', ') || 'none'}\n` +
        `Article text:\n${body}\n\n` +
        `Return JSON exactly in this shape:\n` +
        `{"takeaways": ["3 concise key takeaways"], ` +
        `"priceImpact": {"direction": "Bullish|Bearish|Neutral", "explanation": "1-2 sentences on the likely impact on the related stock price (or the broad market if no ticker)"}, ` +
        `"sentiment": {"label": "Bullish|Bearish|Neutral", "score": -100 to 100 integer, "rationale": "1 sentence"}}\n` +
        `Use only the information provided; do not invent facts or numbers.`,
    );
    const score = Number(raw.sentiment?.score);
    return {
      takeaways: list(raw.takeaways, 3),
      priceImpact: { direction: label(raw.priceImpact?.direction), explanation: text(raw.priceImpact?.explanation) },
      sentiment: {
        label: label(raw.sentiment?.label),
        score: Number.isFinite(score) ? Math.max(-100, Math.min(100, Math.round(score))) : 0,
        rationale: text(raw.sentiment?.rationale),
      },
    };
  });
}

export function analyzeStock(symbol: string): Promise<AnalystReport> {
  return cachedAi<AnalystReport>(`analyst:${symbol}`, 6 * 3600, async () => {
    const [stock, earnings, recs, news] = await Promise.allSettled([
      getStock(symbol),
      finnhubEarnings(symbol),
      finnhubRecommendations(symbol),
      getNews('ticker', [symbol], 12),
    ]);
    const facts = {
      profile: stock.status === 'fulfilled' ? stock.value : null,
      recentEarnings: earnings.status === 'fulfilled' ? earnings.value : null,
      analystRecommendationTrends: recs.status === 'fulfilled' ? (recs.value ?? []).slice(0, 3) : null,
      recentHeadlines:
        news.status === 'fulfilled' ? news.value.slice(0, 10).map((a) => `${a.publishedAt.slice(0, 10)}: ${a.headline}`) : [],
    };
    const raw = await geminiJson<Record<string, any>>(
      `You are a senior equity research analyst. Write an executive research brief on the stock ${symbol}.\n` +
        `Live data (JSON) fetched just now:\n${truncate(JSON.stringify(facts), 9000)}\n\n` +
        `Use the live data where available and your general knowledge of the company. If something is not known or not in the data, say so rather than guessing. Never fabricate figures.\n` +
        `Return JSON exactly in this shape:\n` +
        `{"businessModel": {"summary": "2-3 sentences", "drivers": ["3-5 revenue drivers"]}, ` +
        `"strengthsRisks": {"strengths": ["3-5 items"], "risks": ["3-5 items"]}, ` +
        `"earnings": {"summary": "2-3 sentences on the most recent quarterly results using recentEarnings (actual vs estimate)", "highlights": ["2-4 items"]}, ` +
        `"sentiment": {"label": "Bullish|Bearish|Neutral", "consensus": "analyst consensus in one phrase based on recommendation trends", "summary": "2-3 sentences"}}`,
      0.4,
    );
    return {
      symbol,
      generatedAt: new Date().toISOString(),
      businessModel: { summary: text(raw.businessModel?.summary), drivers: list(raw.businessModel?.drivers) },
      strengthsRisks: {
        strengths: list(raw.strengthsRisks?.strengths),
        risks: list(raw.strengthsRisks?.risks),
      },
      earnings: { summary: text(raw.earnings?.summary), highlights: list(raw.earnings?.highlights) },
      sentiment: {
        label: label(raw.sentiment?.label),
        consensus: text(raw.sentiment?.consensus),
        summary: text(raw.sentiment?.summary),
      },
    };
  });
}
