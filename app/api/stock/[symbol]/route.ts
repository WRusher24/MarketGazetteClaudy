import type { NextRequest } from 'next/server';
import { cleanSymbol, fail, ok } from '@/lib/http';
import { getStock } from '@/lib/stock';

export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  try {
    const symbol = cleanSymbol(decodeURIComponent(params.symbol));
    if (!symbol) return fail('Invalid symbol', 400);
    const stock = await getStock(symbol);
    return stock ? ok(stock) : fail(`No market data found for ${symbol}`, 404);
  } catch (e) {
    return fail(e);
  }
}
