import { fail, ok } from '@/lib/http';
import { getIndices } from '@/lib/yahoo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(await getIndices());
  } catch (e) {
    return fail(e);
  }
}
