import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { cleanSymbol, fail, ok, readJson } from '@/lib/http';
import type { Note } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toNote = (r: any): Note => ({
  id: Number(r.id),
  symbol: r.symbol,
  body: r.body,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
});

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('symbol');
    const symbol = raw ? cleanSymbol(raw) : null;
    if (raw && !symbol) return fail('Invalid symbol', 400);
    const rows = symbol
      ? await query('SELECT * FROM notes WHERE symbol = $1 ORDER BY created_at DESC', [symbol])
      : await query('SELECT * FROM notes ORDER BY updated_at DESC LIMIT 300');
    return ok(rows.map(toNote));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const b = await readJson<{ symbol?: string; body?: string }>(req);
    const symbol = cleanSymbol(b.symbol);
    const body = String(b.body ?? '').trim().slice(0, 5000);
    if (!symbol || !body) return fail('symbol and body are required', 400);
    const rows = await query('INSERT INTO notes (symbol, body) VALUES ($1, $2) RETURNING *', [symbol, body]);
    return ok(toNote(rows[0]));
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req: Request) {
  try {
    const b = await readJson<{ id?: number; body?: string }>(req);
    const body = String(b.body ?? '').trim().slice(0, 5000);
    if (!b.id || !body) return fail('id and body are required', 400);
    const rows = await query('UPDATE notes SET body = $2, updated_at = now() WHERE id = $1 RETURNING *', [Number(b.id), body]);
    return rows[0] ? ok(toNote(rows[0])) : fail('Note not found', 404);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get('id'));
    if (!Number.isInteger(id)) return fail('Invalid id', 400);
    await query('DELETE FROM notes WHERE id = $1', [id]);
    return ok({ id });
  } catch (e) {
    return fail(e);
  }
}
