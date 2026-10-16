import type { NextRequest } from 'next/server';
import { getEarnings } from '@/lib/calendar';
import { cleanSymbols, fail, ok } from '@/lib/http';
import { getWatchlistSymbols } from '@/lib/watchlist';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Upcoming earnings for the given symbols, or for every watchlist symbol when none are given. */
export async function GET(req: NextRequest) {
  try {
    const explicit = cleanSymbols(req.nextUrl.searchParams.get('symbols'), 60);
    const symbols = explicit.length ? explicit : await getWatchlistSymbols();
    return ok({ items: await getEarnings(symbols) });
  } catch (e) {
    return fail(e, 502);
  }
}
