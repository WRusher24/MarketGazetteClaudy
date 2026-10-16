import type { NextRequest } from 'next/server';
import { finnhubSearch } from '@/lib/finnhub';
import { fail, ok } from '@/lib/http';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 40);
  if (q.length < 1) return ok([]);
  try {
    const data = await finnhubSearch(q);
    const results = ((data?.result ?? []) as { symbol: string; displaySymbol: string; description: string; type: string }[])
      .filter((r) => !r.symbol.includes('.') && (r.type === 'Common Stock' || r.type === 'ETP' || r.type === 'ADR'))
      .slice(0, 8)
      .map((r) => ({ symbol: r.symbol, name: r.description, type: r.type }));
    return ok(results);
  } catch (e) {
    return fail(e);
  }
}
