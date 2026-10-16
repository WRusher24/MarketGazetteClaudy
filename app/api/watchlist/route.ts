import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { cleanSymbol, fail, ok, readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query<{ symbol: string }>('SELECT symbol FROM watchlist ORDER BY added_at');
    return ok(rows.map((r) => r.symbol));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const { symbol } = await readJson<{ symbol?: string }>(req);
    const clean = cleanSymbol(symbol);
    if (!clean) return fail('Invalid symbol', 400);
    await query('INSERT INTO watchlist (symbol) VALUES ($1) ON CONFLICT (symbol) DO NOTHING', [clean]);
    return ok({ symbol: clean });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const clean = cleanSymbol(req.nextUrl.searchParams.get('symbol'));
    if (!clean) return fail('Invalid symbol', 400);
    await query('DELETE FROM watchlist WHERE symbol = $1', [clean]);
    return ok({ symbol: clean });
  } catch (e) {
    return fail(e);
  }
}
