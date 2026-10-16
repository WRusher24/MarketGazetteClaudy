import { isIP } from 'node:net';
import { decodeEntities, stripHtml } from './text';
import { UA } from './yahoo';

export interface ArticleBody {
  paragraphs: string[];
  image: string | null;
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const kind = isIP(h);
  if (kind === 4) {
    const [a, b] = h.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (kind === 6) return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80');
  return false;
}

export function assertPublicUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported URL protocol');
  if (isPrivateHost(url.hostname)) throw new Error('URL host is not allowed');
  return url;
}

async function fetchHtml(raw: string): Promise<string> {
  let current = assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(current, {
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) throw new Error('Redirect without location');
      current = assertPublicUrl(new URL(loc, current).toString());
      continue;
    }
    if (!res.ok) throw new Error(`Publisher responded ${res.status}`);
    const type = res.headers.get('content-type') ?? '';
    if (!type.includes('html')) throw new Error('Not an HTML page');
    return (await res.text()).slice(0, 1_500_000);
  }
  throw new Error('Too many redirects');
}

function metaContent(html: string, prop: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
  const alt = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, 'i');
  const m = html.match(re) ?? html.match(alt);
  return m ? decodeEntities(m[1]) : null;
}

/** Best-effort readable-text extraction from the publisher page (paragraph tags only). */
export async function extractArticle(url: string): Promise<ArticleBody> {
  const html = await fetchHtml(url);
  const image = metaContent(html, 'og:image');
  const cleaned = html
    .replace(/<(script|style|noscript|nav|header|footer|aside|form|svg|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  const scope = cleaned.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? cleaned;
  const seen = new Set<string>();
  const paragraphs: string[] = [];
  for (const m of scope.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = stripHtml(m[1]);
    if (text.length < 60 || seen.has(text)) continue;
    if (/^(sign up|subscribe|read more|advertisement|copyright|click here)/i.test(text)) continue;
    seen.add(text);
    paragraphs.push(text);
    if (paragraphs.length >= 40) break;
  }
  return { paragraphs, image: image && /^https?:\/\//.test(image) ? image : null };
}
