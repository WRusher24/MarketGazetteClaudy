import type { Article, SentimentLabel, SentimentRadar } from './types';
import { cachedAi, geminiJson } from './gemini';

const POSITIVE = [
  'surge', 'soar', 'rally', 'jump', 'gain', 'beat', 'record', 'upgrade', 'bullish', 'growth', 'profit', 'strong',
  'rise', 'climb', 'boost', 'outperform', 'optimis', 'rebound', 'high', 'buy', 'expands', 'approval', 'wins',
];
const NEGATIVE = [
  'plunge', 'slump', 'fall', 'drop', 'loss', 'miss', 'downgrade', 'bearish', 'weak', 'decline', 'cut', 'layoff',
  'lawsuit', 'probe', 'fear', 'recession', 'selloff', 'sell-off', 'tumble', 'crash', 'warn', 'risk', 'fraud', 'tariff',
];

export function lexiconLabel(text: string): SentimentLabel {
  const t = text.toLowerCase();
  let score = 0;
  for (const w of POSITIVE) if (t.includes(w)) score++;
  for (const w of NEGATIVE) if (t.includes(w)) score--;
  return score > 0 ? 'Bullish' : score < 0 ? 'Bearish' : 'Neutral';
}

function tally(labels: SentimentLabel[], method: 'ai' | 'lexicon'): SentimentRadar {
  const bullish = labels.filter((l) => l === 'Bullish').length;
  const bearish = labels.filter((l) => l === 'Bearish').length;
  const neutral = labels.length - bullish - bearish;
  const score = labels.length ? Math.round(((bullish - bearish) / labels.length) * 100) : 0;
  const label: SentimentLabel = score > 12 ? 'Bullish' : score < -12 ? 'Bearish' : 'Neutral';
  return { bullish, bearish, neutral, score, label, sample: labels.length, method };
}

export async function computeRadar(articles: Article[]): Promise<SentimentRadar> {
  const sample = articles.slice(0, 30);
  if (!sample.length) return tally([], 'lexicon');
  const fallback = () => tally(sample.map((a) => lexiconLabel(`${a.headline} ${a.summary}`)), 'lexicon');
  try {
    const key = `radar:${sample.map((a) => a.id).join('').slice(0, 200)}`;
    const radar = await cachedAi<SentimentRadar>(key, 900, async () => {
      const list = sample.map((a, i) => `${i + 1}. ${a.headline}`).join('\n');
      const result = await geminiJson<{ labels: string[] }>(
        `Classify the market sentiment of each financial headline as exactly one of "Bullish", "Bearish" or "Neutral" ` +
          `from the perspective of the broad stock market. Return JSON: {"labels": [...]} with exactly ${sample.length} entries in order.\n\n${list}`,
        0,
      );
      const labels = (result.labels ?? []).map((l, i): SentimentLabel => {
        const v = String(l).toLowerCase();
        if (v.startsWith('bull')) return 'Bullish';
        if (v.startsWith('bear')) return 'Bearish';
        if (v.startsWith('neu')) return 'Neutral';
        return lexiconLabel(sample[i]?.headline ?? '');
      });
      if (labels.length < sample.length / 2) throw new Error('Incomplete sentiment response');
      return tally(labels, 'ai');
    });
    return radar;
  } catch {
    return fallback();
  }
}
