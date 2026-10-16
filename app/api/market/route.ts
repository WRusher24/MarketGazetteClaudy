import { fail, ok } from '@/lib/http';
import { getMarketOverview } from '@/lib/market';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    return ok(await getMarketOverview());
  } catch (e) {
    return fail(e);
  }
}
