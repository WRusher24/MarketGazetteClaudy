import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { cleanSymbol, fail, ok, readJson } from '@/lib/http';
import type { Highlight } from '@/lib/types';

export const dynamic = 'force-dynamic';

const MAX_HIGHLIGHT = 2000;
const MAX_PER_ARTICLE = 100;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toHighlight = (r: any): Highlight => ({
  id: Number(r.id),
  articleId: r.article_id,
  articleTitle: r.article_title,
  articleUrl: r.article_url,
  symbol: r.symbol,
  body: r.body,
  createdAt: new Date(r.created_at).toISOString(),
});

/** Highlights for one article (?article=) or all of them, newest first. */
export async function GET(req: NextRequest) {
  try {
    const article = req.nextUrl.searchParams.get('article');
    if (article !== null && (!article || article.length > 200)) return fail('Invalid article', 400);
    const rows = article
      ? await query('SELECT * FROM highlights WHERE article_id = $1 ORDER BY created_at DESC', [article])
      : await query('SELECT * FROM highlights ORDER BY created_at DESC LIMIT 500');
    return ok(rows.map(toHighlight));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const b = await readJson<{ articleId?: string; articleTitle?: string; articleUrl?: string; symbol?: string; body?: string }>(req);
    const articleId = String(b.articleId ?? '').trim().slice(0, 200);
    const body = String(b.body ?? '').replace(/\s+/g, ' ').trim();
    if (!articleId) return fail('articleId is required', 400);
    if (!body) return fail('Select some text to highlight first', 400);
    if (body.length > MAX_HIGHLIGHT) return fail(`Highlights are limited to ${MAX_HIGHLIGHT} characters`, 400);
    const count = await query<{ n: string }>('SELECT count(*) AS n FROM highlights WHERE article_id = $1', [articleId]);
    if (Number(count[0].n) >= MAX_PER_ARTICLE) return fail(`Up to ${MAX_PER_ARTICLE} highlights per article`, 400);
    const symbol = b.symbol ? cleanSymbol(b.symbol) ?? '' : '';
    const rows = await query(
      `INSERT INTO highlights (article_id, article_title, article_url, symbol, body)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [articleId, String(b.articleTitle ?? '').slice(0, 500), String(b.articleUrl ?? '').slice(0, 2000), symbol, body],
    );
    return ok(toHighlight(rows[0]), 201);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) return fail('Invalid id', 400);
    await query('DELETE FROM highlights WHERE id = $1', [id]);
    return ok({ id });
  } catch (e) {
    return fail(e);
  }
}
