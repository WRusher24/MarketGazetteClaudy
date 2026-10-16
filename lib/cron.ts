import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { fail } from './http';

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Anyone else is refused. */
export function cronAuthResponse(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return fail('CRON_SECRET is not set on the server', 500);
  const got = Buffer.from(req.headers.get('authorization') ?? '');
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
