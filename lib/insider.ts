import { fh, finnhubRecommendations } from './finnhub';

export interface InsiderTrade {
  name: string;
  date: string;
  code: string;
  codeLabel: string;
  /** Change in shares held: positive for acquisitions, negative for disposals. */
  shares: number | null;
  price: number | null;
  filed: string;
}

export interface RatingChange {
  period: string;
  from: string;
  to: string;
  score: number;
  previousScore: number;
  direction: 'up' | 'down';
}

const CODE_LABELS: Record<string, string> = {
  P: 'Open-market purchase',
  S: 'Open-market sale',
  A: 'Grant or award',
  M: 'Option exercise',
  F: 'Tax withholding',
  G: 'Gift',
  D: 'Disposal to issuer',
};

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Maps Finnhub insider rows to trades, newest first. */
export function mapInsiderRows(rows: unknown[], limit = 25): InsiderTrade[] {
  const out: InsiderTrade[] = [];
  for (const raw of rows) {
    const r = raw as Record<string, unknown>;
    const date = typeof r.transactionDate === 'string' ? r.transactionDate : '';
    if (!date) continue;
    const code = typeof r.transactionCode === 'string' ? r.transactionCode.toUpperCase() : '';
    out.push({
      name: typeof r.name === 'string' ? r.name : 'Unknown insider',
      date,
      code,
      codeLabel: CODE_LABELS[code] ?? (code ? `Code ${code}` : 'Unspecified'),
      shares: num(r.change),
      price: num(r.transactionPrice),
      filed: typeof r.filingDate === 'string' ? r.filingDate : '',
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** Weighted consensus on a 1 (strong sell) to 5 (strong buy) scale. Null when there are no ratings. */
export function consensusScore(t: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }): number | null {
  const total = t.strongBuy + t.buy + t.hold + t.sell + t.strongSell;
  if (total <= 0) return null;
  return (5 * t.strongBuy + 4 * t.buy + 3 * t.hold + 2 * t.sell + t.strongSell) / total;
}

export function consensusLabel(score: number): string {
  if (score >= 4.5) return 'Strong Buy';
  if (score >= 3.5) return 'Buy';
  if (score >= 2.5) return 'Hold';
  if (score >= 1.5) return 'Sell';
  return 'Strong Sell';
}

interface Trend {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

/**
 * Changes in the monthly analyst consensus. Only emitted when the label moves or the weighted score
 * shifts by at least 0.2, so noise between months is not reported as a change.
 */
export function ratingChanges(trends: Trend[], minShift = 0.2): RatingChange[] {
  const sorted = [...trends].sort((a, b) => a.period.localeCompare(b.period));
  const out: RatingChange[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = consensusScore(sorted[i - 1]);
    const cur = consensusScore(sorted[i]);
    if (prev === null || cur === null) continue;
    const from = consensusLabel(prev);
    const to = consensusLabel(cur);
    if (from === to && Math.abs(cur - prev) < minShift) continue;
    out.push({
      period: sorted[i].period,
      from,
      to,
      score: Math.round(cur * 100) / 100,
      previousScore: Math.round(prev * 100) / 100,
      direction: cur >= prev ? 'up' : 'down',
    });
  }
  return out.reverse();
}

/** Finnhub insider transactions. Throws with Finnhub's status if the plan does not include this endpoint. */
export async function getInsiderTrades(symbol: string): Promise<InsiderTrade[]> {
  const raw = await fh<{ data?: unknown[] }>('/stock/insider-transactions', { symbol }, 3600);
  return mapInsiderRows(raw.data ?? []);
}

export async function getRatingChanges(symbol: string): Promise<RatingChange[]> {
  const trends = (await finnhubRecommendations(symbol)) as Trend[];
  return ratingChanges(Array.isArray(trends) ? trends : []);
}
