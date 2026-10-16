import type { NextRequest } from 'next/server';
import { cleanSymbol, fail, HttpError, ok, readJson } from '@/lib/http';
import { addMember, getWatchlistSymbols, removeMember } from '@/lib/watchlist';

export const dynamic = 'force-dynamic';

/** Every distinct symbol across all watchlists. */
export async function GET() {
  try {
    return ok(await getWatchlistSymbols());
  } catch (e) {
    return fail(e);
  }
}

function parseListId(raw: unknown): number | null | 'invalid' {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 'invalid';
}

export async function POST(req: Request) {
  try {
    const { symbol, listId } = await readJson<{ symbol?: string; listId?: unknown }>(req);
    const clean = cleanSymbol(symbol);
    if (!clean) return fail('Invalid symbol', 400);
    const list = parseListId(listId);
    if (list === 'invalid') return fail('Invalid listId', 400);
    const id = await addMember(clean, list);
    return ok({ symbol: clean, listId: id });
  } catch (e) {
    return fail(e, e instanceof HttpError ? e.status : 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const clean = cleanSymbol(req.nextUrl.searchParams.get('symbol'));
    if (!clean) return fail('Invalid symbol', 400);
    const list = parseListId(req.nextUrl.searchParams.get('listId'));
    if (list === 'invalid') return fail('Invalid listId', 400);
    await removeMember(clean, list);
    return ok({ symbol: clean, listId: list });
  } catch (e) {
    return fail(e);
  }
}
