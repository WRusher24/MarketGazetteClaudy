// All formatting uses the en-US locale so numbers always render with Western digits (0-9).
const LOCALE = 'en-US';

const usd = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'USD' });
const usdCompact = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 2,
});
const compact = new Intl.NumberFormat(LOCALE, { notation: 'compact', maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'full' });

const ok = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n);

export const fmtPrice = (n: number | null | undefined) => (ok(n) ? usd.format(n) : '--');
export const fmtNumber = (n: number | null | undefined) => (ok(n) ? plain.format(n) : '--');
export const fmtCompactUsd = (n: number | null | undefined) => (ok(n) ? usdCompact.format(n) : '--');
export const fmtVolume = (n: number | null | undefined) => (ok(n) ? compact.format(n) : '--');
export const fmtPct = (n: number | null | undefined) => (ok(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : '--');
export const fmtPlainPct = (n: number | null | undefined) => (ok(n) ? `${n.toFixed(2)}%` : '--');
export const fmtChange = (n: number | null | undefined) =>
  ok(n) ? `${n >= 0 ? '+' : '-'}${usd.format(Math.abs(n))}` : '--';
export const fmtDateTime = (iso: string) => dateTime.format(new Date(iso));
export const fmtToday = () => dateOnly.format(new Date());

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return day < 7 ? `${day}d ago` : dateTime.format(new Date(iso));
}

export const trend = (n: number | null | undefined): 'up' | 'down' | 'flat' =>
  !ok(n) || n === 0 ? 'flat' : n > 0 ? 'up' : 'down';
