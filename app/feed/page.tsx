import LeadStory from '@/components/LeadStory';
import NewsSection from '@/components/NewsSection';
import SentimentGauge from '@/components/SentimentGauge';
import { fmtToday } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default function FeedPage() {
  return (
    <div className="page">
      <h1 className="page-title">Gazette Feed</h1>
      <p className="muted" suppressHydrationWarning>
        {fmtToday()}
      </p>
      <LeadStory />
      <div className="dash-grid">
        <div className="stack">
          <NewsSection title="Top Headlines" url="/api/news?scope=top&limit=40" limit={18} skip={1} />
          <NewsSection
            title="Watchlist News"
            url="/api/news?scope=watchlist&limit=40"
            limit={12}
            empty="Add tickers to your watchlist to see stories about them here."
          />
        </div>
        <aside className="stack">
          <SentimentGauge />
        </aside>
      </div>
    </div>
  );
}
