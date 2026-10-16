import { INDICES, yahooChart } from './yahoo';
import { POPULAR_STOCKS, SECTOR_ETFS } from './universe';

export interface MarketQuote {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
}

export interface MarketOverview {
  asOf: string;
  indices: MarketQuote[];
  sectors: MarketQuote[];
  gainers: MarketQuote[];
  losers: MarketQuote[];
  /** Symbols whose quote could not be loaded. The UI shows the count so gaps are never silent. */
  unavailable: string[];
  universeSize: number;
}

const OVERVIEW_REVALIDATE = 300;

/** Sorts the universe by day change and keeps the top gainers and losers (only real up or down moves). */
export function rankMovers(quotes: MarketQuote[], count = 5): { gainers: MarketQuote[]; losers: MarketQuote[] } {
  const sorted = [...quotes].sort((a, b) => b.changePct - a.changePct);
  return {
    gainers: sorted.filter((q) => q.changePct > 0).slice(0, count),
    losers: sorted.filter((q) => q.changePct < 0).reverse().slice(0, count),
  };
}

/** Day change from Yahoo chart metadata. Returns null when Yahoo gives no usable price. */
export async function yahooDayQuote(symbol: string, label: string): Promise<MarketQuote | null> {
  const { meta } = await yahooChart(symbol, '1d', '1d', OVERVIEW_REVALIDATE);
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  if (typeof price !== 'number' || typeof prev !== 'number' || prev === 0) return null;
  return { symbol, label, price, change: price - prev, changePct: ((price - prev) / prev) * 100 };
}

async function settle(items: { symbol: string; label: string }[], unavailable: string[]): Promise<MarketQuote[]> {
  const results = await Promise.allSettled(items.map((i) => yahooDayQuote(i.symbol, i.label)));
  const out: MarketQuote[] = [];
  results.forEach((r, idx) => {
    if (r.status === 'fulfilled' && r.value) out.push(r.value);
    else unavailable.push(items[idx].symbol);
  });
  return out;
}

export async function getMarketOverview(): Promise<MarketOverview> {
  const unavailable: string[] = [];
  const stocks = POPULAR_STOCKS.map((s) => ({ symbol: s.symbol, label: s.symbol }));
  const [indices, sectors, universe] = await Promise.all([
    settle(INDICES, unavailable),
    settle(SECTOR_ETFS, unavailable),
    settle(stocks, unavailable),
  ]);
  const { gainers, losers } = rankMovers(universe);
  return {
    asOf: new Date().toISOString(),
    indices,
    sectors,
    gainers,
    losers,
    unavailable,
    universeSize: POPULAR_STOCKS.length,
  };
}
