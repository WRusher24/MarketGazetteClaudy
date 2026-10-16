import type { NextRequest } from 'next/server';
import { addLot, deleteLot, listLots, parseLotInput } from '@/lib/holdings';
import { fail, HttpError, ok, readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(await listLots());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = await readJson<Record<string, unknown>>(req);
    return ok(await addLot(parseLotInput(body)), 201);
  } catch (e) {
    return fail(e, e instanceof HttpError ? e.status : 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = Number(req.nextUrl.searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) return fail('Invalid id', 400);
    if (!(await deleteLot(id))) return fail('Holding not found', 404);
    return ok({ id });
  } catch (e) {
    return fail(e);
  }
}
