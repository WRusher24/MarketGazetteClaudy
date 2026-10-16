import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { fail, ok, readJson } from '@/lib/http';
import type { Bookmark } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toBookmark = (r: any): Bookmark => ({
  id: Number(r.id),
  kind: r.kind,
  key: r.ref_key,
  title: r.title,
  source: r.source,
  url: r.url,
  image: r.image ?? null,
  summary: r.summary,
  body: r.body,
  symbol: r.symbol,
  savedAt: new Date(r.saved_at).toISOString(),
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM bookmarks ORDER BY saved_at DESC LIMIT 200');
    return ok(rows.map(toBookmark));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const b = await readJson<Partial<Bookmark>>(req);
    if (!b.key || !b.title || (b.kind !== 'article' && b.kind !== 'report')) {
      return fail('kind, key and title are required', 400);
    }
    const rows = await query(
      `INSERT INTO bookmarks (kind, ref_key, title, source, url, image, summary, body, symbol)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (ref_key) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, body = EXCLUDED.body
       RETURNING *`,
      [
        b.kind,
        String(b.key).slice(0, 120),
        String(b.title).slice(0, 500),
        String(b.source ?? '').slice(0, 120),
        String(b.url ?? '').slice(0, 2000),
        b.image ? String(b.image).slice(0, 2000) : null,
        String(b.summary ?? '').slice(0, 2000),
        String(b.body ?? '').slice(0, 60000),
        String(b.symbol ?? '').slice(0, 15),
      ],
    );
    return ok(toBookmark(rows[0]));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get('key');
    if (!key) return fail('Missing key', 400);
    await query('DELETE FROM bookmarks WHERE ref_key = $1', [key]);
    return ok({ key });
  } catch (e) {
    return fail(e);
  }
}
