import type { NextRequest } from 'next/server';
import { cleanSymbol, fail, ok } from '@/lib/http';
import { RANGES, yahooChart } from '@/lib/yahoo';

export async function GET(req: NextRequest) {
  try {
    const symbol = cleanSymbol(req.nextUrl.searchParams.get('symbol'));
    const rangeKey = (req.nextUrl.searchParams.get('range') ?? '1D').toUpperCase();
    const cfg = RANGES[rangeKey];
    if (!symbol || !cfg) return fail('Invalid symbol or range', 400);
    const { candles, gmtOffset } = await yahooChart(symbol, cfg.range, cfg.interval, rangeKey === '1D' ? 30 : 300);
    return ok({ symbol, range: rangeKey, gmtOffset, candles });
  } catch (e) {
    return fail(e, 502);
  }
}
