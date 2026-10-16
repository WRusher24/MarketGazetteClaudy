import { finnhubMetrics, finnhubProfile, finnhubQuote } from './finnhub';
import { yahooChart, type YahooMeta } from './yahoo';
import type { Quote, StockDetail } from './types';

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

async function quoteOne(symbol: string): Promise<Quote | null> {
  try {
    const q = await finnhubQuote(symbol);
    if (q && q.c > 0) {
      return {
        symbol,
        price: q.c,
        change: q.d ?? q.c - q.pc,
        changePct: q.dp ?? (q.pc ? ((q.c - q.pc) / q.pc) * 100 : 0),
        open: q.o,
        high: q.h,
        low: q.l,
        prevClose: q.pc,
      };
    }
  } catch {
    /* fall through to Yahoo */
  }
  try {
    const { meta } = await yahooChart(symbol, '1d', '1d', 15);
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose ?? meta.previousClose;
    if (typeof price === 'number' && typeof prev === 'number' && prev !== 0) {
      return {
        symbol,
        name: meta.shortName,
        price,
        change: price - prev,
        changePct: ((price - prev) / prev) * 100,
        high: meta.regularMarketDayHigh,
        low: meta.regularMarketDayLow,
        prevClose: prev,
      };
    }
  } catch {
    /* no data */
  }
  return null;
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  const all = await Promise.all(symbols.map(quoteOne));
  return all.filter((q): q is Quote => q !== null);
}

export async function getStock(symbol: string): Promise<StockDetail | null> {
  const [quote, profile, metrics, yahoo] = await Promise.allSettled([
    quoteOne(symbol),
    finnhubProfile(symbol),
    finnhubMetrics(symbol),
    yahooChart(symbol, '1d', '1d', 30),
  ]);
  const q = quote.status === 'fulfilled' ? quote.value : null;
  if (!q) return null;
  const p = profile.status === 'fulfilled' && profile.value ? profile.value : {};
  const m = metrics.status === 'fulfilled' && metrics.value?.metric ? metrics.value.metric : {};
  const y: YahooMeta = yahoo.status === 'fulfilled' ? yahoo.value.meta : {};

  const marketCapM = num(p.marketCapitalization);
  return {
    symbol,
    name: p.name || y.longName || y.shortName || q.name || symbol,
    exchange: p.exchange || y.exchangeName || '',
    industry: p.finnhubIndustry || '',
    logo: p.logo || '',
    website: p.weburl || '',
    currency: p.currency || y.currency || 'USD',
    price: q.price,
    change: q.change,
    changePct: q.changePct,
    open: q.open ?? null,
    high: q.high ?? y.regularMarketDayHigh ?? null,
    low: q.low ?? y.regularMarketDayLow ?? null,
    prevClose: q.prevClose ?? null,
    marketCap: marketCapM !== null ? marketCapM * 1e6 : null,
    pe: num(m.peTTM) ?? num(m.peBasicExclExtraTTM) ?? num(m.peNormalizedAnnual),
    high52: num(m['52WeekHigh']) ?? num(y.fiftyTwoWeekHigh),
    low52: num(m['52WeekLow']) ?? num(y.fiftyTwoWeekLow),
    volume: num(y.regularMarketVolume),
    dividendYield: num(m.dividendYieldIndicatedAnnual) ?? num(m.currentDividendYieldTTM),
  };
}
