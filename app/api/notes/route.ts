import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { cleanSymbol, fail, ok, readJson } from '@/lib/http';
import { parseTags } from '@/lib/library';
import type { Note } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toNote = (r: any): Note => ({
  id: Number(r.id),
  symbol: r.symbol,
  body: r.body,
  createdAt: new Date(r.created_at).toISOString(),
  updatedAt: new Date(r.updated_at).toISOString(),
  tags: r.tags ?? [],
  articleId: r.article_id ?? null,
  articleTitle: r.article_title ?? null,
  articleUrl: r.article_url ?? null,
});

const cleanText = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get('symbol');
    const symbol = raw ? cleanSymbol(raw) : null;
    if (raw && !symbol) return fail('Invalid symbol', 400);
    const article = req.nextUrl.searchParams.get('article');
    if (article !== null && (!article || article.length > 200)) return fail('Invalid article', 400);

    if (article) {
      const rows = await query('SELECT * FROM notes WHERE article_id = $1 ORDER BY created_at DESC', [article]);
      return ok(rows.map(toNote));
    }
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
    const b = await readJson<{ symbol?: string; body?: string; tags?: unknown; articleId?: string; articleTitle?: string; articleUrl?: string }>(req);
    const symbol = cleanSymbol(b.symbol);
    const body = cleanText(b.body, 5000);
    if (!symbol || !body) return fail('symbol and body are required', 400);
    let tags: string[];
    try {
      tags = parseTags(b.tags);
    } catch (e) {
      return fail(e, 400);
    }
    const articleId = b.articleId ? cleanText(b.articleId, 200) : null;
    const rows = await query(
      `INSERT INTO notes (symbol, body, tags, article_id, article_title, article_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [symbol, body, tags, articleId, articleId ? cleanText(b.articleTitle, 500) : null, articleId ? cleanText(b.articleUrl, 2000) : null],
    );
    return ok(toNote(rows[0]));
  } catch (e) {
    return fail(e);
  }
}

/** Updates the body and/or the tags of a note. Only the fields sent are changed. */
export async function PUT(req: Request) {
  try {
    const b = await readJson<{ id?: number; body?: string; tags?: unknown }>(req);
    const id = Number(b.id);
    if (!Number.isInteger(id) || id <= 0) return fail('id is required', 400);
    const body = b.body === undefined ? null : cleanText(b.body, 5000);
    if (body === '') return fail('body cannot be empty', 400);
    let tags: string[] | null = null;
    if (b.tags !== undefined) {
      try {
        tags = parseTags(b.tags);
      } catch (e) {
        return fail(e, 400);
      }
    }
    if (body === null && tags === null) return fail('Nothing to update', 400);
    const rows = await query(
      `UPDATE notes SET body = COALESCE($2::text, body), tags = COALESCE($3::text[], tags), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, body, tags],
    );
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
