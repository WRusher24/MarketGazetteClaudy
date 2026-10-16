import { NextResponse } from 'next/server';
import { generateBriefing, type BriefingKind } from '@/lib/briefing';
import { cronAuthResponse } from '@/lib/cron';
import { ok } from '@/lib/http';

// Scheduled daily from vercel.json. On Sundays (UTC) it also writes the Weekly Recap, so the project
// stays within Vercel Hobby's cron job limit. Vercel allows up to 60s per invocation.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Result = { ok: true; editionDate: string; stories: number } | { ok: false; error: string };

export async function GET(req: Request) {
  const denied = cronAuthResponse(req);
  if (denied) return denied;

  const kinds: BriefingKind[] = new Date().getUTCDay() === 0 ? ['daily', 'weekly'] : ['daily'];
  const results: Partial<Record<BriefingKind, Result>> = {};
  for (const kind of kinds) {
    try {
      const b = await generateBriefing(kind);
      results[kind] = { ok: true, editionDate: b.editionDate, stories: b.stories.length };
    } catch (e) {
      console.error(`[cron/daily-briefing] ${kind}:`, e);
      results[kind] = { ok: false, error: e instanceof Error ? e.message : 'Briefing failed' };
    }
  }

  const failures = Object.entries(results).filter(([, r]) => !r.ok);
  if (failures.length) {
    const error = failures.map(([kind, r]) => `${kind}: ${r.ok ? '' : r.error}`).join(' | ');
    return NextResponse.json({ error, results }, { status: 502 });
  }
  return ok(results);
}
