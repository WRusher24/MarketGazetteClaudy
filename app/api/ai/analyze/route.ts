import { analyzeStock } from '@/lib/ai';

import { cleanSymbol, fail, ok } from '@/lib/http';

 

// Vercel Hobby allows up to 60s. lib/gemini.ts keeps its total time budget below this.

export const maxDuration = 60;

 

export async function POST(req: Request) {

  let body: { symbol?: string };

  try {

    body = await req.json();

  } catch {

    return fail('Invalid JSON body', 400);

  }

 

  const symbol = cleanSymbol(body?.symbol);

  if (!symbol) return fail('Invalid symbol', 400);

 

  try {

    return ok(await analyzeStock(symbol));

  } catch (e) {

    console.error(`[api/ai/analyze] ${symbol}:`, e);

    return fail(e, 502);

  }

}