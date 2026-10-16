import type { NextRequest } from 'next/server';
import { cleanSymbols, fail, ok } from '@/lib/http';
import { getQuotes } from '@/lib/stock';

export async function GET(req: NextRequest) {
  try {
    const symbols = cleanSymbols(req.nextUrl.searchParams.get('symbols'));
    return ok(symbols.length ? await getQuotes(symbols) : []);
  } catch (e) {
    return fail(e);
  }
}
