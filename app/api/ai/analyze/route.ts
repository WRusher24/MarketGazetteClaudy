import { analyzeStock } from '@/lib/ai';
import { cleanSymbol, fail, ok, readJson } from '@/lib/http';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { symbol } = await readJson<{ symbol?: string }>(req);
    const clean = cleanSymbol(symbol);
    if (!clean) return fail('Invalid symbol', 400);
    return ok(await analyzeStock(clean));
  } catch (e) {
    return fail(e);
  }
}
