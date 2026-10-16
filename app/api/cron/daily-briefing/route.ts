import { BriefingError, generateBriefing } from '@/lib/briefing';
import { cronAuthResponse } from '@/lib/cron';
import { fail, ok } from '@/lib/http';

// Scheduled from vercel.json. Vercel Hobby allows up to 60s per invocation.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = cronAuthResponse(req);
  if (denied) return denied;
  try {
    const b = await generateBriefing('daily');
    return ok({ kind: b.kind, editionDate: b.editionDate, stories: b.stories.length });
  } catch (e) {
    console.error('[cron/daily-briefing]', e);
    return fail(e, e instanceof BriefingError ? e.status : 502);
  }
}
