import { query } from './db';
import { finnhubMetrics } from './finnhub';
import {
  periodReturnPct,
  screenerSymbols,
  SCREENER_COOLDOWN_MS,
  SCREENER_PACE_MS,
  sectorFor,
  type ScreenerRow,
  type ScreenerSnapshot,
} from './screen';
import { yahooChart } from './yahoo';

export type { ScreenerRow, ScreenerSnapshot, ScreenFilters } from './screen';
export { filterRows, periodReturnPct, screenerSymbols, sectorFor, SCREENER_COOLDOWN_MS, SCREENER_MAX, SCREENER_PACE_MS } from './screen';

const SNAPSHOT_NAME = 'screener';

const reason = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Rebuilds the screener snapshot. Momentum and price come from Yahoo (parallel). Market cap and P/E
 * come from Finnhub's metrics endpoint, one call per symbol, paced to respect the rate limit.
 */
export async function refreshScreener(watch: string[]): Promise<ScreenerSnapshot> {
  const { symbols, skipped } = screenerSymbols(watch);
  const history = await Promise.allSettled(symbols.map((s) => yahooChart(s.symbol, '3mo', '1d', 3600)));

  const unavailable: { symbol: string; reason: string }[] = [];
  const rows: ScreenerRow[] = [];
  for (let i = 0; i < symbols.length; i++) {
    const { symbol, source } = symbols[i];

    let marketCap: number | null = null;
    let pe: number | null = null;
    let metricError: string | null = null;
    try {
      const m = (await finnhubMetrics(symbol))?.metric ?? {};
      const capM = typeof m.marketCapitalization === 'number' ? m.marketCapitalization : null;
      marketCap = capM !== null ? capM * 1e6 : null;
      const peRaw = m.peTTM ?? m.peBasicExclExtraTTM ?? m.peNormalizedAnnual;
      pe = typeof peRaw === 'number' && Number.isFinite(peRaw) ? peRaw : null;
    } catch (e) {
      metricError = `Finnhub metrics: ${reason(e)}`;
    }

    const h = history[i];
    let price: number | null = null;
    let momentum3m: number | null = null;
    let historyError: string | null = null;
    if (h.status === 'fulfilled') {
      const closes = h.value.candles.map((c) => c.close);
      price = closes.length ? closes[closes.length - 1] : null;
      momentum3m = periodReturnPct(closes);
    } else {
      historyError = `Yahoo price history: ${reason(h.reason)}`;
    }

    if (marketCap === null && pe === null && momentum3m === null) {
      unavailable.push({ symbol, reason: [metricError, historyError].filter(Boolean).join('; ') || 'no data' });
    } else {
      rows.push({ symbol, sector: sectorFor(symbol), price, marketCap, pe, momentum3m, source });
    }
    if (metricError && momentum3m !== null) unavailable.push({ symbol, reason: `${metricError} (partial row)` });
    if (i < symbols.length - 1) await new Promise((r) => setTimeout(r, SCREENER_PACE_MS));
  }

  const snapshot: ScreenerSnapshot = { generatedAt: new Date().toISOString(), rows, unavailable, skipped };
  await query(
    `INSERT INTO market_snapshots (name, payload, generated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (name) DO UPDATE SET payload = EXCLUDED.payload, generated_at = now()`,
    [SNAPSHOT_NAME, JSON.stringify(snapshot)],
  );
  return snapshot;
}

export async function latestScreener(): Promise<{ snapshot: ScreenerSnapshot; generatedAt: Date } | null> {
  const rows = await query<{ payload: ScreenerSnapshot; generated_at: string }>(
    'SELECT payload, generated_at FROM market_snapshots WHERE name = $1',
    [SNAPSHOT_NAME],
  );
  const row = rows[0];
  return row ? { snapshot: row.payload, generatedAt: new Date(row.generated_at) } : null;
}
