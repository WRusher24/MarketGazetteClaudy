import { summarizeArticle } from '@/lib/ai';
import { fail, ok, readJson } from '@/lib/http';

export const maxDuration = 60;

interface Body {
  id?: string;
  headline?: string;
  summary?: string;
  content?: string;
  related?: string[];
  source?: string;
}

export async function POST(req: Request) {
  try {
    const b = await readJson<Body>(req);
    if (!b.id || !b.headline) return fail('id and headline are required', 400);
    const result = await summarizeArticle({
      id: String(b.id).slice(0, 64),
      headline: String(b.headline).slice(0, 400),
      summary: String(b.summary ?? '').slice(0, 2000),
      content: String(b.content ?? '').slice(0, 12000),
      related: Array.isArray(b.related) ? b.related.slice(0, 8).map((s) => String(s).slice(0, 15)) : [],
      source: String(b.source ?? '').slice(0, 100),
    });
    return ok(result);
  } catch (e) {
    return fail(e);
  }
}
