import type { NextRequest } from 'next/server';
import { cleanSymbol, cleanSymbols, fail, ok } from '@/lib/http';
import { getNews, type NewsScope } from '@/lib/news';
import { query } from '@/lib/db';

async function watchlistSymbols(): Promise<string[]> {
  const rows = await query<{ symbol: string }>('SELECT symbol FROM watchlist ORDER BY added_at');
  return rows.map((r) => r.symbol);
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const scope = (sp.get('scope') ?? 'top') as NewsScope;
    const limit = Math.min(Math.max(Number(sp.get('limit')) || 40, 1), 80);

    if (scope === 'top') return ok(await getNews('top', [], limit));

    if (scope === 'ticker') {
      const symbol = cleanSymbol(sp.get('symbol'));
      return symbol ? ok(await getNews('ticker', [symbol], limit)) : fail('Invalid symbol', 400);
    }

    if (scope === 'watchlist') {
      const explicit = cleanSymbols(sp.get('symbols'));
      const symbols = explicit.length ? explicit : await watchlistSymbols();
      return ok(await getNews('watchlist', symbols, limit));
    }
    return fail('Invalid scope', 400);
  } catch (e) {
    return fail(e);
  }
}
