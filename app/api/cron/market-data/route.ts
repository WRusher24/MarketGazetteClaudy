import { cronAuthResponse } from '@/lib/cron';
import { fail, ok } from '@/lib/http';
import { refreshScreener } from '@/lib/screener';
import { getWatchlistSymbols } from '@/lib/watchlist';

// Runs after the US close on weekdays (see vercel.json). Refreshes the stock screener snapshot.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = cronAuthResponse(req);
  if (denied) return denied;
  try {
    const snapshot = await refreshScreener(await getWatchlistSymbols());
    return ok({ rows: snapshot.rows.length, unavailable: snapshot.unavailable.length, skipped: snapshot.skipped.length });
  } catch (e) {
    console.error('[cron/market-data]', e);
    return fail(e, 502);
  }
}
