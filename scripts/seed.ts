import { query } from '../lib/db';
import { getNews, saveArticles } from '../lib/news';
import type { Article } from '../lib/types';

const WATCHLIST = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'GOOGL'];

// Shown only if every live news source is unreachable while seeding. These are app tips, not market news.
const WELCOME: Article[] = [
  {
    id: 'welcome-reader',
    headline: 'Welcome to MarketGazette: read every story without leaving the page',
    summary:
      'Click any headline to open the native reading drawer with the full article text, a publisher badge and an AI Executive Summary powered by Gemini.',
    source: 'MarketGazette',
    url: 'https://github.com/WRusher24/MarketGazetteClaudy',
    image: null,
    publishedAt: new Date().toISOString(),
    related: [],
    category: 'general',
  },
  {
    id: 'welcome-watchlist',
    headline: 'Build your watchlist to unlock a personalised news stream',
    summary: 'Add tickers from the Watchlist page or any stock page. Watchlist News shows only stories about your tickers.',
    source: 'MarketGazette',
    url: 'https://github.com/WRusher24/MarketGazetteClaudy',
    image: null,
    publishedAt: new Date(Date.now() - 60000).toISOString(),
    related: ['NVDA', 'AAPL'],
    category: 'general',
  },
];

async function main() {
  for (const symbol of WATCHLIST) {
    await query('INSERT INTO watchlist (symbol) VALUES ($1) ON CONFLICT (symbol) DO NOTHING', [symbol]);
  }
  console.log(`Watchlist seeded: ${WATCHLIST.join(', ')}`);

  const top = await getNews('top', [], 40);
  const company = await getNews('watchlist', WATCHLIST, 40);
  const live = [...top, ...company];
  if (live.length) {
    console.log(`Cached ${live.length} live articles from Yahoo Finance RSS and Finnhub.`);
  } else {
    await saveArticles(WELCOME);
    console.log('Live news unreachable; cached welcome articles instead.');
  }
  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
