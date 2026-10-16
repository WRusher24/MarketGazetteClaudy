import { cleanListName, deleteList, renameList } from '@/lib/watchlist';
import { fail, HttpError, ok, readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseId(params.id);
    if (!id) return fail('Invalid list id', 400);
    const { name } = await readJson<{ name?: unknown }>(req);
    const clean = cleanListName(name);
    if (!clean) return fail('Name must be 1 to 40 characters', 400);
    await renameList(id, clean);
    return ok({ id, name: clean });
  } catch (e) {
    return fail(e, e instanceof HttpError ? e.status : 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseId(params.id);
    if (!id) return fail('Invalid list id', 400);
    await deleteList(id);
    return ok({ id });
  } catch (e) {
    return fail(e, e instanceof HttpError ? e.status : 500);
  }
}
