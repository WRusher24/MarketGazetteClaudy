import { fh, isoDay } from './finnhub';

export interface EarningsItem {
  symbol: string;
  /** YYYY-MM-DD as reported by Finnhub. */
  date: string;
  /** bmo = before market open, amc = after market close, dmh = during market hours, '' = not given. */
  hour: string;
  epsEstimate: number | null;
  epsActual: number | null;
  revenueEstimate: number | null;
  quarter: number | null;
  year: number | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Adds whole days to a YYYY-MM-DD date. Uses UTC so the result never depends on the server's time zone. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Local calendar date of a Date as YYYY-MM-DD (used by the browser for "tomorrow" checks). */
export function localIsoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Items reporting the day after `todayIso`: the trigger for the day-before reminder. */
export function reminderItems(items: EarningsItem[], todayIso: string): EarningsItem[] {
  const tomorrow = addDays(todayIso, 1);
  return items.filter((i) => i.date === tomorrow);
}

export function hourLabel(hour: string): string {
  switch (hour) {
    case 'bmo':
      return 'Before market open';
    case 'amc':
      return 'After market close';
    case 'dmh':
      return 'During market hours';
    default:
      return 'Time not given';
  }
}

/** Finnhub earnings calendar for the next `days` days, limited to the given symbols. Fails loudly if Finnhub refuses. */
export async function getEarnings(symbols: string[], days = 21): Promise<EarningsItem[]> {
  if (!symbols.length) return [];
  const from = isoDay(new Date());
  const to = addDays(from, days);
  const raw = await fh<{ earningsCalendar?: unknown[] }>('/calendar/earnings', { from, to }, 3600);
  const wanted = new Set(symbols);
  const items: EarningsItem[] = [];
  for (const r of (raw.earningsCalendar ?? []) as Record<string, unknown>[]) {
    const symbol = typeof r.symbol === 'string' ? r.symbol.toUpperCase() : '';
    if (!wanted.has(symbol) || typeof r.date !== 'string') continue;
    items.push({
      symbol,
      date: r.date,
      hour: typeof r.hour === 'string' ? r.hour : '',
      epsEstimate: num(r.epsEstimate),
      epsActual: num(r.epsActual),
      revenueEstimate: num(r.revenueEstimate),
      quarter: num(r.quarter),
      year: num(r.year),
    });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol));
}
