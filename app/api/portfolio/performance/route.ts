import { buildPerformance } from '@/lib/performance';
import { listLots } from '@/lib/holdings';
import { fail, ok } from '@/lib/http';
import { yahooChart } from '@/lib/yahoo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BENCHMARK = '^GSPC';
const MAX_SYMBOLS = 25;
const toDate = (unix: number) => new Date(unix * 1000).toISOString().slice(0, 10);

/** Portfolio value against the same money put into the S&P 500 on each purchase date (five years of daily closes). */
export async function GET() {
  try {
    const lots = await listLots();
    const symbols = Array.from(new Set(lots.map((l) => l.symbol)));
    if (symbols.length > MAX_SYMBOLS) return fail(`Performance is limited to ${MAX_SYMBOLS} different tickers`, 400);

    const [bench, ...rest] = await Promise.allSettled([BENCHMARK, ...symbols].map((s) => yahooChart(s, '5y', '1d', 3600)));
    if (bench.status === 'rejected') {
      return fail(`S&P 500 history unavailable: ${bench.reason instanceof Error ? bench.reason.message : 'unknown error'}`, 502);
    }
    const toSeries = (c: { time: number; close: number }[]) => c.map((x) => ({ date: toDate(x.time), close: x.close }));
    const history = new Map<string, { date: string; close: number }[]>();
    const unavailable: string[] = [];
    rest.forEach((r, i) => {
      if (r.status === 'fulfilled') history.set(symbols[i], toSeries(r.value.candles));
      else unavailable.push(symbols[i]);
    });

    const result = buildPerformance(lots, history, toSeries(bench.value.candles));
    return ok({ benchmark: 'S&P 500', ...result, unavailable });
  } catch (e) {
    return fail(e, 502);
  }
}
