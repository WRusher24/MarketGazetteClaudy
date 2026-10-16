import { cleanListName, createList, getLists } from '@/lib/watchlist';
import { fail, HttpError, ok, readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(await getLists());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await readJson<{ name?: unknown }>(req);
    const clean = cleanListName(name);
    if (!clean) return fail('Name must be 1 to 40 characters', 400);
    return ok(await createList(clean), 201);
  } catch (e) {
    return fail(e, e instanceof HttpError ? e.status : 500);
  }
}
