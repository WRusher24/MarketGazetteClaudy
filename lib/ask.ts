import { fmtNumber, fmtPct, fmtPrice } from './format';
import type { Article, StockDetail } from './types';

export interface AskSource {
  /** F1, F2... for figures; H1, H2... for headlines. The answer cites these ids in brackets. */
  id: string;
  kind: 'figure' | 'headline';
  label: string;
  url?: string;
}

export interface AskAnswer {
  answer: string;
  citations: AskSource[];
}

export interface AskInputs {
  stock: StockDetail | null;
  /** First item of Finnhub's /stock/earnings response, if it loaded. */
  lastEarnings: { period?: unknown; actual?: unknown; estimate?: unknown } | null;
  /** Latest analyst rating counts, if they loaded. */
  ratings: { period?: unknown; strongBuy?: unknown; buy?: unknown; hold?: unknown; sell?: unknown; strongSell?: unknown } | null;
  news: Article[];
  /** Names of data sources that failed, so the model is told what it does not have. */
  missing: string[];
}

const MAX_HEADLINES = 10;

/** Builds numbered, citable sources from live data. Only figures we actually have are included. */
export function buildAskSources(input: AskInputs): { sources: AskSource[]; missing: string[] } {
  const sources: AskSource[] = [];
  const figure = (label: string) => sources.push({ id: `F${sources.filter((s) => s.kind === 'figure').length + 1}`, kind: 'figure', label });
  const s = input.stock;
  if (s) {
    figure(`Price ${fmtPrice(s.price)}, day change ${fmtPct(s.changePct)} (${s.currency})`);
    figure(`Market cap ${s.marketCap ? `$${fmtNumber(s.marketCap / 1e9)} billion` : 'not available'}; P/E ${fmtNumber(s.pe)}`);
    figure(`52-week range ${fmtPrice(s.low52)} to ${fmtPrice(s.high52)}; day range ${fmtPrice(s.low)} to ${fmtPrice(s.high)}`);
    figure(`Volume ${s.volume ? fmtNumber(s.volume) : 'not available'}; dividend yield ${s.dividendYield === null ? 'not available' : `${fmtNumber(s.dividendYield)}%`}`);
  }
  if (input.lastEarnings) {
    const e = input.lastEarnings;
    figure(`Last reported quarter ${String(e.period ?? 'unknown')}: EPS actual ${fmtNumber(e.actual as number)} vs estimate ${fmtNumber(e.estimate as number)}`);
  }
  if (input.ratings) {
    const r = input.ratings;
    figure(
      `Analyst ratings for ${String(r.period ?? 'latest month')}: strong buy ${String(r.strongBuy ?? 0)}, buy ${String(r.buy ?? 0)}, hold ${String(r.hold ?? 0)}, sell ${String(r.sell ?? 0)}, strong sell ${String(r.strongSell ?? 0)}`,
    );
  }
  input.news.slice(0, MAX_HEADLINES).forEach((a, i) => {
    sources.push({
      id: `H${i + 1}`,
      kind: 'headline',
      label: `${a.publishedAt.slice(0, 10)} ${a.source}: ${a.headline}`,
      url: a.url,
    });
  });
  return { sources, missing: input.missing };
}

/** Text the model reads. Source ids match the ones shown to the user. */
export function sourcesPrompt(sources: AskSource[], missing: string[]): string {
  const lines = sources.map((s) => `[${s.id}] ${s.label}`);
  if (missing.length) lines.push(`Not available right now: ${missing.join(', ')}`);
  return lines.join('\n');
}

const CITE_RE = /\[(F\d+|H\d+)\]/g;

/**
 * Checks the model's answer. Citations must refer to sources we supplied; anything else is dropped,
 * so the UI never shows a citation that does not exist.
 */
export function parseAskAnswer(raw: { answer?: unknown; cite?: unknown }, sources: AskSource[]): AskAnswer {
  const answer = typeof raw.answer === 'string' ? raw.answer.trim().slice(0, 1500) : '';
  if (!answer) throw new Error('Gemini returned an empty answer. Try again.');
  const byId = new Map(sources.map((s) => [s.id, s]));
  const ids = new Set<string>();
  if (Array.isArray(raw.cite)) for (const c of raw.cite) if (typeof c === 'string') ids.add(c.trim());
  for (const m of answer.matchAll(CITE_RE)) ids.add(m[1]);
  const citations = Array.from(ids)
    .map((id) => byId.get(id))
    .filter((s): s is AskSource => Boolean(s));
  return { answer, citations };
}
