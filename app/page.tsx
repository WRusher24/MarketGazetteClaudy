import LeadStory from '@/components/LeadStory';
import NewsSection from '@/components/NewsSection';
import SentimentGauge from '@/components/SentimentGauge';
import WatchTable from '@/components/WatchTable';

export default function DashboardPage() {
  return (
    <div className="page">
      <h1 className="page-title">My Market Gazette</h1>
      <div className="dash-grid">
        <div className="stack">
          <LeadStory />
          <NewsSection title="Top Headlines" url="/api/news?scope=top" variant="row" limit={8} skip={1} />
          <NewsSection
            title="Watchlist News"
            url="/api/news?scope=watchlist"
            variant="row"
            limit={6}
            empty="Add tickers to your watchlist to see stories about them here."
          />
        </div>
        <aside className="stack">
          <SentimentGauge />
          <section className="card">
            <div className="section-head">
              <h2>Watchlist</h2>
            </div>
            <WatchTable />
          </section>
        </aside>
      </div>
    </div>
  );
}
