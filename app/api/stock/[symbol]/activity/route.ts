import { cleanSymbol, fail, ok } from '@/lib/http';
import { getInsiderTrades, getRatingChanges } from '@/lib/insider';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Part<T> = { ok: true; data: T } | { ok: false; error: string };

async function part<T>(run: () => Promise<T>): Promise<Part<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (e) {
    // Shown in the UI so a plan limit or outage is visible, not an empty list.
    return { ok: false, error: e instanceof Error ? e.message : 'Request failed' };
  }
}

/** Insider trades and analyst consensus changes. Each part succeeds or fails on its own. */
export async function GET(_req: Request, { params }: { params: { symbol: string } }) {
  const symbol = cleanSymbol(decodeURIComponent(params.symbol));
  if (!symbol) return fail('Invalid symbol', 400);
  const [insiders, ratings] = await Promise.all([part(() => getInsiderTrades(symbol)), part(() => getRatingChanges(symbol))]);
  return ok({ symbol, insiders, ratings });
}
