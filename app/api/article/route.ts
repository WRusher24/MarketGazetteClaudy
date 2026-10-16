import type { NextRequest } from 'next/server';
import { extractArticle } from '@/lib/article';
import { fail, ok } from '@/lib/http';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return fail('Missing url', 400);
  try {
    return ok(await extractArticle(url));
  } catch {
    // The reader falls back to the feed summary when a publisher page cannot be parsed.
    return ok({ paragraphs: [], image: null });
  }
}
