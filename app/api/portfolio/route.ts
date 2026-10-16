import { buildPositions, type Quote } from '@/lib/portfolio';
import { listLots } from '@/lib/holdings';
import { fail, ok } from '@/lib/http';
import { getQuotes } from '@/lib/stock';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_SYMBOLS = 50;

/** Every lot, grouped into positions and valued at live quotes. Symbols without a quote are listed as unpriced. */
export async function GET() {
  try {
    const lots = await listLots();
    const symbols = Array.from(new Set(lots.map((l) => l.symbol)));
    if (symbols.length > MAX_SYMBOLS) return fail(`Portfolios are limited to ${MAX_SYMBOLS} different tickers`, 400);
    const quotes = new Map<string, Quote>();
    for (const q of symbols.length ? await getQuotes(symbols) : []) {
      quotes.set(q.symbol, { price: q.price, change: q.change ?? null });
    }
    const { positions, totals } = buildPositions(lots, quotes);
    return ok({ asOf: new Date().toISOString(), lots, positions, totals });
  } catch (e) {
    return fail(e, 502);
  }
}
