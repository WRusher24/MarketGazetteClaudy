'use client';

import type { ReactNode } from 'react';
import { useApi } from '@/lib/client';
import type { Article } from '@/lib/types';
import NewsCard from './NewsCard';

interface Props {
  title: string;
  url: string | null;
  variant?: 'card' | 'row';
  limit?: number;
  /** Rendered instead of the list when there are no articles. */
  empty?: ReactNode;
  grid?: boolean;
  skip?: number;
  refreshMs?: number;
}

export function Skeletons({ n = 3 }: { n?: number }) {
  return (
    <div className="skeletons" aria-busy="true">
      {Array.from({ length: n }).map((_, i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}

export default function NewsSection({ title, url, variant = 'card', limit = 6, empty, grid = true, skip = 0, refreshMs = 120000 }: Props) {
  const { data, error, loading, reload } = useApi<Article[]>(url, refreshMs);
  const items = (data ?? []).slice(skip, skip + limit);

  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        <button type="button" className="link-btn" onClick={reload}>
          Refresh
        </button>
      </div>
      {loading && !data ? (
        <Skeletons />
      ) : error && !data ? (
        <p className="muted">Could not load news: {error}</p>
      ) : items.length === 0 ? (
        <p className="muted">{empty ?? 'No stories available right now.'}</p>
      ) : (
        <div className={variant === 'row' ? 'stack' : grid ? 'news-grid' : 'stack'}>
          {items.map((a) => (
            <NewsCard key={a.id} article={a} variant={variant} />
          ))}
        </div>
      )}
    </section>
  );
}
