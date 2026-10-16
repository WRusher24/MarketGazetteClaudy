import { getWatchlistSymbols } from '@/lib/watchlist';
import { fail, ok } from '@/lib/http';
import { latestScreener, refreshScreener, SCREENER_COOLDOWN_MS } from '@/lib/screener';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Latest saved screener snapshot, or null before the first refresh. */
export async function GET() {
  try {
    const latest = await latestScreener();
    return ok(latest ? { ...latest.snapshot, generatedAt: latest.generatedAt.toISOString() } : null);
  } catch (e) {
    return fail(e);
  }
}

/** Manual refresh from the UI. Limited to one run every five minutes. */
export async function POST() {
  try {
    const latest = await latestScreener();
    const wait = latest ? SCREENER_COOLDOWN_MS - (Date.now() - latest.generatedAt.getTime()) : 0;
    if (wait > 0) return fail(`The screener was refreshed recently. Try again in ${Math.ceil(wait / 1000)} seconds.`, 429);
    return ok(await refreshScreener(await getWatchlistSymbols()));
  } catch (e) {
    console.error('[api/screener]', e);
    return fail(e, 502);
  }
}
