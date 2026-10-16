import { fail, ok } from '@/lib/http';
import { getNews } from '@/lib/news';
import { computeRadar } from '@/lib/sentiment';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    return ok(await computeRadar(await getNews('top', [], 30)));
  } catch (e) {
    return fail(e);
  }
}
