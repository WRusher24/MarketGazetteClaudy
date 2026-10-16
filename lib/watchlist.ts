import { query } from './db';

/** Symbols on the watchlist, oldest first. Phase 2 will scope this to named lists. */
export async function getWatchlistSymbols(): Promise<string[]> {
  const rows = await query<{ symbol: string }>('SELECT symbol FROM watchlist ORDER BY added_at');
  return rows.map((r) => r.symbol);
}
