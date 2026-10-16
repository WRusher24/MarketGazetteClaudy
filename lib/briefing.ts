import { query } from './db';
import { geminiJson } from './gemini';
import { getNews } from './news';
import { getQuotes } from './stock';
import { getWatchlistSymbols } from './watchlist';
import { yahooChart } from './yahoo';
import type { Article, Quote } from './types';

export type BriefingKind = 'daily' | 'weekly';
export const BRIEFING_KINDS: BriefingKind[] = ['daily', 'weekly'];

/** Minimum gap between manual regenerations of the same edition. */
export const REGENERATE_COOLDOWN_MS = 60_000;
const MAX_WATCHLIST = 25;
const MAX_HEADLINES = 25;

export interface BriefingStory {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  image: string | null;
  publishedAt: string;
  symbols: string[];
}

export interface BriefingMover {
  symbol: string;
  changePct: number;
  basis: 'day' | 'week';
}

export interface Briefing {
  kind: BriefingKind;
  editionDate: string;
  generatedAt: string;
  lead: string;
  stories: BriefingStory[];
  movers: BriefingMover[];
  outlook: string;
  watchlist: string[];
}

export class BriefingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Daily editions are dated by UTC day. Weekly editions are dated by the Sunday that starts the week they recap. */
export function editionDateFor(kind: BriefingKind, now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (kind === 'weekly') d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

/** Percent move across the candles: first session's open to the latest close. Null if there is not enough data. */
export function weeklyMovePct(candles: { open: number; close: number }[]): number | null {
  if (candles.length < 2) return null;
  const base = candles[0].open;
  const end = candles[candles.length - 1].close;
  if (!base || !Number.isFinite(base) || !Number.isFinite(end)) return null;
  return ((end - base) / base) * 100;
}

/** Keeps the largest absolute moves, biggest first. */
export function pickMovers(moves: BriefingMover[], count = 5): BriefingMover[] {
  return [...moves].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, count);
}

/** Milliseconds left before a manual regenerate is allowed. Zero means it is allowed now. */
export function cooldownRemainingMs(generatedAt: Date | null, now: Date): number {
  if (!generatedAt) return 0;
  return Math.max(0, REGENERATE_COOLDOWN_MS - (now.getTime() - generatedAt.getTime()));
}

interface RawEdition {
  lead?: unknown;
  stories?: unknown;
  outlook?: unknown;
}

/**
 * Checks Gemini's answer against the headlines it was given. Stories refer to headlines by number,
 * so every link and image comes from a real article rather than from model output.
 */
export function parseEdition(
  raw: RawEdition,
  articles: Article[],
  maxStories: number,
): { lead: string; outlook: string; stories: BriefingStory[] } {
  const lead = typeof raw.lead === 'string' ? raw.lead.trim() : '';
  const outlook = typeof raw.outlook === 'string' ? raw.outlook.trim() : '';
  if (!lead || !outlook) throw new Error('Gemini returned an incomplete briefing. Try again.');

  const seen = new Set<number>();
  const stories: BriefingStory[] = [];
  for (const entry of Array.isArray(raw.stories) ? raw.stories : []) {
    const e = entry as { n?: unknown; why?: unknown };
    const n = Number(e?.n);
    if (!Number.isInteger(n) || n < 1 || n > articles.length || seen.has(n)) continue;
    seen.add(n);
    const a = articles[n - 1];
    stories.push({
      id: a.id,
      title: a.headline,
      summary: typeof e.why === 'string' ? e.why.trim() : '',
      url: a.url,
      source: a.source,
      image: a.image,
      publishedAt: a.publishedAt,
      symbols: a.related,
    });
    if (stories.length >= maxStories) break;
  }
  if (!stories.length) throw new Error('Gemini did not pick any valid headlines. Try again.');
  return { lead, outlook, stories };
}

function dedupeArticles(list: Article[]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const a of list) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

const headlineLines = (articles: Article[]) =>
  articles
    .map((a, i) => `${i + 1}. [${a.source}, ${a.publishedAt.slice(0, 16)}Z${a.related.length ? `, tickers: ${a.related.join('/')}` : ''}] ${a.headline}`)
    .join('\n');

async function dailyInputs(symbols: string[]) {
  const [quotes, watchNews, topNews] = await Promise.all([
    getQuotes(symbols),
    getNews('watchlist', symbols, 20),
    getNews('top', [], 12),
  ]);
  const moves: BriefingMover[] = quotes.map((q: Quote) => ({ symbol: q.symbol, changePct: q.changePct, basis: 'day' }));
  return {
    moves: pickMovers(moves),
    articles: dedupeArticles([...watchNews, ...topNews]).slice(0, MAX_HEADLINES),
    dataLines: `Biggest moves today (% change, live quotes):\n${
      pickMovers(moves, 10).map((m) => `${m.symbol} ${m.changePct.toFixed(2)}%`).join(', ') || 'none available'
    }`,
  };
}

async function weeklyInputs(symbols: string[]) {
  const settled = await Promise.allSettled(symbols.map((s) => yahooChart(s, '5d', '1d', 3600)));
  const moves: BriefingMover[] = [];
  const failed: string[] = [];
  settled.forEach((r, i) => {
    const pct = r.status === 'fulfilled' ? weeklyMovePct(r.value.candles) : null;
    if (pct === null) failed.push(symbols[i]);
    else moves.push({ symbol: symbols[i], changePct: pct, basis: 'week' });
  });
  const [watchNews, topNews] = await Promise.all([getNews('watchlist', symbols, 30), getNews('top', [], 15)]);
  return {
    moves: pickMovers(moves),
    articles: dedupeArticles([...watchNews, ...topNews]).slice(0, MAX_HEADLINES),
    dataLines:
      `Biggest moves over the last 5 sessions (first session's open to latest close): ` +
      (pickMovers(moves, 10).map((m) => `${m.symbol} ${m.changePct.toFixed(2)}%`).join(', ') || 'none available') +
      (failed.length ? `\nNo price history available for: ${failed.join(', ')}` : ''),
  };
}

function prompt(kind: BriefingKind, editionDate: string, symbols: string[], dataLines: string, articles: Article[]): string {
  const daily = kind === 'daily';
  return (
    `You are the editor of a personal stock newspaper. Write the ${daily ? 'morning edition' : 'weekly recap'} dated ${editionDate}.\n` +
    `Use ONLY the data below. Never invent prices, percentages, events, companies or quotes. If the data is thin, say so.\n` +
    `Watchlist: ${symbols.join(', ')}\n${dataLines}\n\n` +
    `Headlines (numbered, most recent first):\n${headlineLines(articles)}\n\n` +
    `Return JSON exactly in this shape:\n` +
    `{"lead": "2-3 sentences summarising ${daily ? 'the day so far for this watchlist and the market' : 'the week for this watchlist and the market'}", ` +
    `"stories": [{"n": <headline number>, "why": "one sentence on why it matters to this watchlist or the market"}] (choose up to ${daily ? 5 : 6} of the most important headlines), ` +
    `"outlook": "one short paragraph: ${daily ? 'what to watch today' : 'what to watch in the coming week'}, based only on the data above"}`
  );
}

/** Builds an edition with Gemini and stores it (one row per kind and date; regenerating overwrites it). */
export async function generateBriefing(kind: BriefingKind, now = new Date()): Promise<Briefing> {
  const symbols = (await getWatchlistSymbols()).slice(0, MAX_WATCHLIST);
  if (!symbols.length) throw new BriefingError('Add tickers to your watchlist before generating a briefing.', 400);

  const inputs = kind === 'daily' ? await dailyInputs(symbols) : await weeklyInputs(symbols);
  const editionDate = editionDateFor(kind, now);
  const raw = await geminiJson<RawEdition>(
    prompt(kind, editionDate, symbols, inputs.dataLines, inputs.articles),
    0.3,
  );
  const maxStories = kind === 'daily' ? 5 : 6;
  const edition = parseEdition(raw, inputs.articles, maxStories);

  const briefing: Briefing = {
    kind,
    editionDate,
    generatedAt: now.toISOString(),
    lead: edition.lead,
    stories: edition.stories,
    movers: inputs.moves,
    outlook: edition.outlook,
    watchlist: symbols,
  };
  await query(
    `INSERT INTO briefings (kind, edition_date, payload, generated_at)
     VALUES ($1, $2::date, $3::jsonb, $4)
     ON CONFLICT (kind, edition_date) DO UPDATE SET payload = EXCLUDED.payload, generated_at = EXCLUDED.generated_at`,
    [kind, editionDate, JSON.stringify(briefing), now.toISOString()],
  );
  return briefing;
}

/** Latest saved edition of a kind, with when it was generated. */
export async function latestBriefing(kind: BriefingKind): Promise<{ briefing: Briefing; generatedAt: Date } | null> {
  const rows = await query<{ payload: Briefing; generated_at: string }>(
    `SELECT payload, generated_at FROM briefings WHERE kind = $1 ORDER BY edition_date DESC LIMIT 1`,
    [kind],
  );
  const row = rows[0];
  return row ? { briefing: row.payload, generatedAt: new Date(row.generated_at) } : null;
}
