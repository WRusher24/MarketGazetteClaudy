// Pure performance maths: the portfolio against the same money invested in the S&P 500 on each purchase date.
import type { Lot } from './portfolio';

export interface PerfPoint {
  date: string;
  /** Market value of the lots bought so far. */
  portfolio: number;
  /** Value of the same cash put into the S&P 500 on each purchase date. */
  benchmark: number;
  /** Total cost of the lots bought so far. */
  invested: number;
}

export interface PerformanceResult {
  points: PerfPoint[];
  /** Lots without a purchase date cannot be placed in time, so they are left out. */
  excludedLots: number;
  /** Symbols with no price history, whose lots are held at cost. */
  missingHistory: string[];
}

/** Last known close on or before `date`, given sorted dates. Returns null before the first close. */
function closeOn(series: { date: string; close: number }[], date: string, cursor: { i: number }): number | null {
  while (cursor.i + 1 < series.length && series[cursor.i + 1].date <= date) cursor.i++;
  return series[cursor.i] && series[cursor.i].date <= date ? series[cursor.i].close : null;
}

/**
 * Walks the benchmark's trading days. A lot is bought on the first trading day on or after its purchase
 * date, at the cost the user entered. Its shares are then valued at each day's close and the benchmark
 * value uses the same money converted into S&P 500 units on the purchase day.
 */
export function buildPerformance(
  lots: Lot[],
  history: Map<string, { date: string; close: number }[]>,
  benchmark: { date: string; close: number }[],
  maxPoints = 400,
): PerformanceResult {
  const dated = lots.filter((l): l is Lot & { acquiredOn: string } => Boolean(l.acquiredOn));
  const excludedLots = lots.length - dated.length;
  const missingHistory = Array.from(new Set(dated.filter((l) => !history.get(l.symbol)?.length).map((l) => l.symbol)));
  const days = benchmark.slice().sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length || !dated.length) return { points: [], excludedLots, missingHistory };

  const state = dated
    .map((l) => ({ lot: l, bought: false, units: 0, cost: l.shares * l.costPerShare, cursor: { i: 0 } }))
    .sort((a, b) => a.lot.acquiredOn.localeCompare(b.lot.acquiredOn));
  const cursors = new Map<string, { i: number }>();
  const all: PerfPoint[] = [];

  for (const day of days) {
    const spx = day.close;
    let portfolio = 0;
    let benchValue = 0;
    let invested = 0;
    for (const s of state) {
      if (!s.bought && s.lot.acquiredOn <= day.date) {
        s.bought = true;
        s.units = s.cost / spx;
      }
      if (!s.bought) continue;
      invested += s.cost;
      benchValue += s.units * spx;
      const series = history.get(s.lot.symbol) ?? [];
      const cur = cursors.get(s.lot.symbol) ?? { i: 0 };
      cursors.set(s.lot.symbol, cur);
      const px = closeOn(series, day.date, cur);
      // Held at cost until the first price arrives, so a missing history never shows as a loss.
      portfolio += px === null ? s.cost : s.lot.shares * px;
    }
    if (invested > 0) all.push({ date: day.date, portfolio, benchmark: benchValue, invested });
  }

  const stride = Math.max(1, Math.ceil(all.length / maxPoints));
  const points = all.filter((_, i) => i % stride === 0 || i === all.length - 1);
  return { points, excludedLots, missingHistory };
}
