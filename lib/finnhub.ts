const BASE = 'https://finnhub.io/api/v1';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fh<T = any>(path: string, params: Record<string, string> = {}, revalidate = 30): Promise<T> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) throw new Error('FINNHUB_API_KEY is not set');
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}${qs ? `?${qs}` : ''}`, {
    headers: { 'X-Finnhub-Token': key },
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Finnhub ${path} responded ${res.status}`);
  return (await res.json()) as T;
}

export interface FinnhubQuote {
  c: number;
  d: number | null;
  dp: number | null;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

export const finnhubQuote = (symbol: string) => fh<FinnhubQuote>('/quote', { symbol }, 15);
export const finnhubProfile = (symbol: string) => fh('/stock/profile2', { symbol }, 3600);
export const finnhubMetrics = (symbol: string) => fh('/stock/metric', { symbol, metric: 'all' }, 1800);
export const finnhubEarnings = (symbol: string) => fh('/stock/earnings', { symbol, limit: '4' }, 3600);
export const finnhubRecommendations = (symbol: string) => fh('/stock/recommendation', { symbol }, 3600);
export const finnhubSearch = (q: string) => fh('/search', { q }, 300);
export const finnhubGeneralNews = () => fh('/news', { category: 'general' }, 120);

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function finnhubCompanyNews(symbol: string) {
  const to = new Date();
  const from = new Date(Date.now() - 7 * 86400000);
  return fh('/company-news', { symbol, from: isoDay(from), to: isoDay(to) }, 120);
}
