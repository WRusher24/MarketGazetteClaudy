'use client';

import { useApi } from '@/lib/client';
import type { Article } from '@/lib/types';
import NewsCard from './NewsCard';
import { Skeletons } from './NewsSection';

/** Front-page lead: the newest top story, preferring one with a cover image. */
export function pickLead(items: Article[]): Article | null {
  const recent = items.slice(0, 8);
  return recent.find((a) => a.image) ?? items[0] ?? null;
}

export default function LeadStory() {
  const { data, loading } = useApi<Article[]>('/api/news?scope=top', 120000);
  const lead = data ? pickLead(data) : null;
  if (loading && !data) return <Skeletons n={1} />;
  if (!lead) return <p className="muted">No lead story available right now.</p>;
  return (
    <section className="section">
      <div className="section-head">
        <h2>Front Page</h2>
      </div>
      <NewsCard article={lead} variant="lead" />
    </section>
  );
}
