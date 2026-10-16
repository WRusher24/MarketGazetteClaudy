// Pure screener types and helpers. Kept free of database and network imports so client components can use them.
import { POPULAR_STOCKS } from './universe';

export interface ScreenerRow {
  symbol: string;
  sector: string;
  price: number | null;
  marketCap: number | null;
  pe: number | null;
  /** Percent change over the last three months (about 63 sessions). */
  momentum3m: number | null;
  source: 'watchlist' | 'universe';
}

export interface ScreenerSnapshot {
  generatedAt: string;
  rows: ScreenerRow[];
  /** Symbols that could not be loaded, each with the reason, so gaps are visible. */
  unavailable: { symbol: string; reason: string }[];
  /** Symbols left out because the run is capped (Finnhub allows 60 calls a minute). */
  skipped: string[];
}

export interface ScreenFilters {
  sector?: string;
  minMarketCap?: number;
  maxPe?: number;
  minMomentum?: number;
}

/** Most symbols one refresh loads. Finnhub allows 60 calls a minute and each symbol needs one. */
export const SCREENER_MAX = 40;
/** Pause between Finnhub calls, keeping one run under 60 calls a minute and under the 60s function limit. */
export const SCREENER_PACE_MS = 1000;
export const SCREENER_COOLDOWN_MS = 5 * 60_000;
const SNAPSHOT_NAME = 'screener';

const SECTOR_BY_SYMBOL = new Map(POPULAR_STOCKS.map((s) => [s.symbol, s.sector]));
export const sectorFor = (symbol: string): string => SECTOR_BY_SYMBOL.get(symbol) ?? 'Unclassified';

/** Percent change from the first to the last close. Null without two usable closes. */
export function periodReturnPct(closes: number[]): number | null {
  const clean = closes.filter((c) => Number.isFinite(c) && c > 0);
  if (clean.length < 2) return null;
  return ((clean[clean.length - 1] - clean[0]) / clean[0]) * 100;
}

/** Watchlist symbols first (they matter most), then the popular universe, capped at SCREENER_MAX. */
export function screenerSymbols(watch: string[], max = SCREENER_MAX): { symbols: { symbol: string; source: 'watchlist' | 'universe' }[]; skipped: string[] } {
  const seen = new Set<string>();
  const all: { symbol: string; source: 'watchlist' | 'universe' }[] = [];
  for (const s of watch) if (!seen.has(s)) (seen.add(s), all.push({ symbol: s, source: 'watchlist' }));
  for (const u of POPULAR_STOCKS) if (!seen.has(u.symbol)) (seen.add(u.symbol), all.push({ symbol: u.symbol, source: 'universe' }));
  return { symbols: all.slice(0, max), skipped: all.slice(max).map((s) => s.symbol) };
}

/** Applies the screener filters. A filter set on a field excludes rows where that field is unknown. */
export function filterRows(rows: ScreenerRow[], f: ScreenFilters): ScreenerRow[] {
  return rows.filter((r) => {
    if (f.sector && r.sector !== f.sector) return false;
    if (f.minMarketCap !== undefined && (r.marketCap === null || r.marketCap < f.minMarketCap)) return false;
    if (f.maxPe !== undefined && (r.pe === null || r.pe <= 0 || r.pe > f.maxPe)) return false;
    if (f.minMomentum !== undefined && (r.momentum3m === null || r.momentum3m < f.minMomentum)) return false;
    return true;
  });
}
