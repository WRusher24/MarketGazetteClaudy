import type { Candle, IndexQuote } from './types';

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

export const RANGES: Record<string, { range: string; interval: string }> = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '60m' },
  '1Y': { range: '1y', interval: '1d' },
  ALL: { range: 'max', interval: '1wk' },
};

export const INDICES: { symbol: string; label: string }[] = [
  { symbol: '^GSPC', label: 'S&P 500' },
  { symbol: '^IXIC', label: 'NASDAQ' },
  { symbol: '^DJI', label: 'Dow Jones' },
  { symbol: '^RUT', label: 'Russell 2000' },
  { symbol: 'BTC-USD', label: 'Bitcoin' },
  { symbol: 'ETH-USD', label: 'Ethereum' },
  { symbol: 'GC=F', label: 'Gold' },
  { symbol: 'CL=F', label: 'Crude Oil' },
];

export interface YahooMeta {
  currency?: string;
  symbol?: string;
  exchangeName?: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketVolume?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  gmtoffset?: number;
}

export interface YahooChart {
  meta: YahooMeta;
  candles: Candle[];
  gmtOffset: number;
}

export async function yahooChart(
  symbol: string,
  range: string,
  interval: string,
  revalidate = 60,
): Promise<YahooChart> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol,
  )}?range=${range}&interval=${interval}&includePrePost=false`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, next: { revalidate } });
  if (!res.ok) throw new Error(`Yahoo chart responded ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(json?.chart?.error?.description ?? 'No chart data');

  const ts: number[] = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0] ?? {};
  const byTime = new Map<number, Candle>();
  for (let i = 0; i < ts.length; i++) {
    const o = q.open?.[i];
    const h = q.high?.[i];
    const l = q.low?.[i];
    const c = q.close?.[i];
    if ([o, h, l, c].some((v) => typeof v !== 'number' || !Number.isFinite(v))) continue;
    byTime.set(ts[i], { time: ts[i], open: o, high: h, low: l, close: c, volume: q.volume?.[i] ?? 0 });
  }
  const candles = Array.from(byTime.values()).sort((a, b) => a.time - b.time);
  const meta: YahooMeta = result.meta ?? {};
  return { meta, candles, gmtOffset: meta.gmtoffset ?? 0 };
}

export async function getIndices(): Promise<IndexQuote[]> {
  const settled = await Promise.allSettled(INDICES.map((i) => yahooChart(i.symbol, '1d', '1d', 30)));
  const out: IndexQuote[] = [];
  settled.forEach((r, idx) => {
    if (r.status !== 'fulfilled') return;
    const price = r.value.meta.regularMarketPrice;
    const prev = r.value.meta.chartPreviousClose ?? r.value.meta.previousClose;
    if (typeof price !== 'number' || typeof prev !== 'number' || prev === 0) return;
    out.push({
      symbol: INDICES[idx].symbol,
      label: INDICES[idx].label,
      price,
      change: price - prev,
      changePct: ((price - prev) / prev) * 100,
    });
  });
  return out;
}
