import type { NextRequest } from 'next/server';
import { BRIEFING_KINDS, BriefingError, cooldownRemainingMs, generateBriefing, latestBriefing, type BriefingKind } from '@/lib/briefing';
import { fail, ok } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function parseKind(raw: string | null | undefined): BriefingKind | null {
  return BRIEFING_KINDS.find((k) => k === raw) ?? null;
}

/** Latest saved edition, or null before the first one has been generated. */
export async function GET(req: NextRequest) {
  try {
    const kind = parseKind(req.nextUrl.searchParams.get('kind'));
    if (!kind) return fail('kind must be "daily" or "weekly"', 400);
    const latest = await latestBriefing(kind);
    return ok(latest?.briefing ?? null);
  } catch (e) {
    return fail(e);
  }
}

/** Manual regenerate from the UI. Limited to one run per kind per cooldown to protect the Gemini quota. */
export async function POST(req: Request) {
  let body: { kind?: string };
  try {
    body = await req.json();
  } catch {
    return fail('Invalid JSON body', 400);
  }
  const kind = parseKind(body?.kind);
  if (!kind) return fail('kind must be "daily" or "weekly"', 400);

  try {
    const latest = await latestBriefing(kind);
    const wait = cooldownRemainingMs(latest?.generatedAt ?? null, new Date());
    if (wait > 0) {
      return fail(`This edition was generated moments ago. Try again in ${Math.ceil(wait / 1000)} seconds.`, 429);
    }
    return ok(await generateBriefing(kind));
  } catch (e) {
    console.error(`[api/briefing] ${kind}:`, e);
    return fail(e, e instanceof BriefingError ? e.status : 502);
  }
}
