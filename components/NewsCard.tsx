'use client';

import Link from 'next/link';
import { useState } from 'react';
import { timeAgo } from '@/lib/format';
import type { Article } from '@/lib/types';
import { useReader } from './Providers';

type Variant = 'lead' | 'card' | 'row';

export function Cover({ src, className }: { src: string | null; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
}

export default function NewsCard({ article, variant = 'card' }: { article: Article; variant?: Variant }) {
  const { openArticle } = useReader();
  const open = () => openArticle(article);

  return (
    <article
      className={`news news-${variant}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      {variant !== 'row' && article.image && (
        <div className="news-cover">
          <Cover src={article.image} />
        </div>
      )}
      <div className="news-body">
        <div className="news-meta">
          <span className="badge">{article.source}</span>
          <time dateTime={article.publishedAt}>{timeAgo(article.publishedAt)}</time>
        </div>
        <h3>{article.headline}</h3>
        {variant !== 'row' && article.summary && <p>{article.summary}</p>}
        {article.related.length > 0 && (
          <div className="chips" onClick={(e) => e.stopPropagation()}>
            {article.related.slice(0, 4).map((s) => (
              <Link key={s} href={`/stock/${encodeURIComponent(s)}`} className="chip">
                {s}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
