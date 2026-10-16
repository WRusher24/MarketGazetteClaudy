// Pure helpers for tags, search and export across saved articles, notes and highlights.
// No imports from the server modules, so client components can use them too.
import type { Bookmark, Highlight, Note } from './types';

export const MAX_TAGS = 10;
const TAG_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;

/**
 * Normalises tags from an array or a comma-separated string: trimmed, lower case, de-duplicated.
 * Throws a plain Error with a user-facing message when a tag is not allowed.
 */
export function parseTags(raw: unknown): string[] {
  if (raw === undefined || raw === null || raw === '') return [];
  const parts = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : null;
  if (!parts) throw new Error('Tags must be a list');
  const out: string[] = [];
  for (const p of parts) {
    const t = String(p).trim().toLowerCase();
    if (!t) continue;
    if (!TAG_RE.test(t)) throw new Error(`Tag "${t}" must use letters, numbers and hyphens (max 24 characters)`);
    if (!out.includes(t)) out.push(t);
  }
  if (out.length > MAX_TAGS) throw new Error(`Use at most ${MAX_TAGS} tags per item`);
  return out;
}

/** Every distinct tag across the given items, sorted. */
export function allTags(items: { tags: string[] }[]): string[] {
  const set = new Set<string>();
  for (const i of items) for (const t of i.tags) set.add(t);
  return Array.from(set).sort();
}

/** All words in the query must appear in the text (case-insensitive). An optional tag must also be present. */
export function matchesQuery(item: { text: string; tags: string[] }, query: string, tag: string | null): boolean {
  if (tag && !item.tags.includes(tag)) return false;
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = item.text.toLowerCase();
  return words.every((w) => hay.includes(w));
}

const fmtDay = (iso: string) => iso.slice(0, 10);

/** Markdown document of saved articles (with their highlights), notes and standalone highlights. */
export function toMarkdown(data: { bookmarks: Bookmark[]; notes: Note[]; highlights: Highlight[]; generatedAt: string }): string {
  const lines: string[] = [];
  lines.push('# MarketGazette export', '', `Generated ${fmtDay(data.generatedAt)}.`, '');

  const articles = data.bookmarks.filter((b) => b.kind === 'article');
  const reports = data.bookmarks.filter((b) => b.kind === 'report');
  const byArticle = new Map<string, Highlight[]>();
  for (const h of data.highlights) byArticle.set(h.articleId, [...(byArticle.get(h.articleId) ?? []), h]);

  lines.push('## Saved articles', '');
  if (!articles.length) lines.push('_None saved._', '');
  for (const a of articles) {
    lines.push(`### ${a.title}`, '');
    lines.push(`- Source: ${a.source || 'unknown'} · Saved ${fmtDay(a.savedAt)}${a.symbol ? ` · Ticker ${a.symbol}` : ''}`);
    if (a.tags.length) lines.push(`- Tags: ${a.tags.map((t) => `#${t}`).join(' ')}`);
    if (a.url) lines.push(`- Link: ${a.url}`);
    if (a.summary) lines.push('', a.summary);
    const hs = byArticle.get(a.key) ?? [];
    if (hs.length) {
      lines.push('', '**Highlights**', '');
      for (const h of hs) lines.push(`> ${h.body.replace(/\n+/g, ' ')}`, '');
    }
    lines.push('');
  }

  lines.push('## AI research reports', '');
  if (!reports.length) lines.push('_None saved._', '');
  for (const r of reports) {
    lines.push(`### ${r.title}`, '', `Saved ${fmtDay(r.savedAt)}`, '', r.summary || '_No summary._', '');
  }

  lines.push('## Notes', '');
  if (!data.notes.length) lines.push('_No notes._', '');
  for (const n of data.notes) {
    lines.push(`### ${n.symbol} · ${fmtDay(n.createdAt)}`, '');
    if (n.articleTitle) lines.push(`Linked article: ${n.articleTitle}${n.articleUrl ? ` (${n.articleUrl})` : ''}`, '');
    if (n.tags.length) lines.push(`Tags: ${n.tags.map((t) => `#${t}`).join(' ')}`, '');
    lines.push(n.body, '');
  }

  const standalone = data.highlights.filter((h) => !data.bookmarks.some((b) => b.key === h.articleId));
  if (standalone.length) {
    lines.push('## Other highlights', '');
    for (const h of standalone) lines.push(`> ${h.body.replace(/\n+/g, ' ')}`, `> — ${h.articleTitle || 'Untitled'} (${fmtDay(h.createdAt)})`, '');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
