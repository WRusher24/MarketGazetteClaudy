import { NextResponse } from 'next/server';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ error: message }, { status });
}

const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.\-^=]{0,14}$/;

export function cleanSymbol(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim().toUpperCase();
  return SYMBOL_RE.test(s) ? s : null;
}

export function cleanSymbols(raw: string | null | undefined, max = 25): string[] {
  const seen = new Set<string>();
  for (const part of (raw ?? '').split(',')) {
    const s = cleanSymbol(part);
    if (s) seen.add(s);
    if (seen.size >= max) break;
  }
  return Array.from(seen);
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error('Invalid JSON body');
  }
}
