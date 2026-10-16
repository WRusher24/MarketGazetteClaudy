import { createHash } from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import { query } from './db';
import { finnhubCompanyNews, finnhubGeneralNews } from './finnhub';
import { stripHtml, truncate } from './text';
import { UA } from './yahoo';
import type { Article } from './types';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const YAHOO_TOP = 'https://finance.yahoo.com/news/rssindex';
const yahooTicker = (s: string) =>
  `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(s)}&region=US&lang=en-US`;

const hash = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16);
const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);
const safeImage = (v: unknown): string | null => (typeof v === 'string' && /^https?:\/\//.test(v) ? v : null);

async function yahooRss(url: string, related: string[] = [], category = 'general'): Promise<Article[]> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, next: { revalidate: 120 } });
    if (!res.ok) return [];
    const xml = parser.parse(await res.text());
    const items = asArray(xml?.rss?.channel?.item);
    const out: Article[] = [];
    for (const item of items) {
      const link = typeof item.link === 'string' ? item.link : '';
      const title = typeof item.title === 'string' ? stripHtml(item.title) : '';
      if (!link || !title) continue;
      const media = asArray(item['media:content'])[0] ?? asArray(item['media:thumbnail'])[0] ?? item.enclosure;
      const published = new Date(item.pubDate ?? Date.now());
      out.push({
        id: hash(link),
        headline: title,
        summary: truncate(stripHtml(typeof item.description === 'string' ? item.description : ''), 600),
        source: typeof item.source === 'string' ? item.source : 'Yahoo Finance',
        url: link,
        image: safeImage(media?.['@_url']),
        publishedAt: Number.isNaN(published.getTime()) ? new Date().toISOString() : published.toISOString(),
        related,
        category,
      });
    }
    return out;
  } catch {
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapFinnhub(items: any[], related: string[] | null): Article[] {
  const out: Article[] = [];
  for (const n of Array.isArray(items) ? items : []) {
    if (!n?.url || !n?.headline) continue;
    const rel: string[] = related
      ? related
      : typeof n.related === 'string'
        ? n.related.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean)
        : [];
    out.push({
      id: hash(n.url),
      headline: stripHtml(String(n.headline)),
      summary: truncate(stripHtml(String(n.summary ?? '')), 800),
      source: String(n.source || 'Finnhub'),
      url: n.url,
      image: safeImage(n.image),
      publishedAt: new Date((Number(n.datetime) || Date.now() / 1000) * 1000).toISOString(),
      related: rel,
      category: String(n.category || 'general'),
    });
  }
  return out;
}

const finnhubGeneral = async (): Promise<Article[]> => {
  try {
    return mapFinnhub(await finnhubGeneralNews(), null);
  } catch {
    return [];
  }
};

const finnhubCompany = async (symbol: string): Promise<Article[]> => {
  try {
    return mapFinnhub(await finnhubCompanyNews(symbol), [symbol]);
  } catch {
    return [];
  }
};

function dedupe(list: Article[]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const a of list) {
    const key = a.headline.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 70);
    if (!key || seen.has(key) || seen.has(a.id)) continue;
    seen.add(key);
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

const byDateDesc = (a: Article, b: Article) => +new Date(b.publishedAt) - +new Date(a.publishedAt);

export async function saveArticles(articles: Article[]): Promise<void> {
  if (!articles.length) return;
  const rows = articles.slice(0, 80);
  const params: unknown[] = [];
  const values = rows.map((a, i) => {
    const o = i * 9;
    params.push(a.id, a.headline, a.summary, a.source, a.url, a.image, a.category, a.related.join(','), a.publishedAt);
    return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8},$${o + 9})`;
  });
  await query(
    `INSERT INTO news_cache (id, headline, summary, source, url, image, category, related, published_at)
     VALUES ${values.join(',')}
     ON CONFLICT (id) DO UPDATE SET headline = EXCLUDED.headline, summary = EXCLUDED.summary,
       image = COALESCE(EXCLUDED.image, news_cache.image), related = EXCLUDED.related, fetched_at = now()`,
    params,
  );
}

export async function readCachedArticles(symbols: string[] = [], limit = 40): Promise<Article[]> {
  const params: unknown[] = [];
  let where = '';
  if (symbols.length) {
    where =
      'WHERE ' +
      symbols
        .map((s) => {
          params.push(`%,${s},%`);
          return `(',' || related || ',') LIKE $${params.length}`;
        })
        .join(' OR ');
  }
  params.push(limit);
  const rows = await query(
    `SELECT id, headline, summary, source, url, image, category, related, published_at
     FROM news_cache ${where} ORDER BY published_at DESC LIMIT $${params.length}`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    headline: r.headline,
    summary: r.summary,
    source: r.source,
    url: r.url,
    image: r.image ?? null,
    category: r.category,
    related: r.related ? String(r.related).split(',').filter(Boolean) : [],
    publishedAt: new Date(r.published_at).toISOString(),
  }));
}

export type NewsScope = 'top' | 'ticker' | 'watchlist';

/** Pulls live news from Yahoo Finance RSS + Finnhub, caches it in Neon, and falls back to the cache. */
export async function getNews(scope: NewsScope, symbols: string[] = [], limit = 40): Promise<Article[]> {
  let lists: Article[][];
  if (scope === 'top') {
    lists = await Promise.all([yahooRss(YAHOO_TOP), finnhubGeneral()]);
  } else {
    const syms = symbols.slice(0, scope === 'ticker' ? 1 : 8);
    if (!syms.length) return [];
    lists = await Promise.all(syms.flatMap((s) => [yahooRss(yahooTicker(s), [s], 'company'), finnhubCompany(s)]));
  }

  const merged = dedupe(lists.flat().sort(byDateDesc)).slice(0, limit);
  if (merged.length) {
    try {
      await saveArticles(merged);
    } catch {
      /* caching is best-effort */
    }
    return merged;
  }
  try {
    return await readCachedArticles(scope === 'top' ? [] : symbols, limit);
  } catch {
    return [];
  }
}
