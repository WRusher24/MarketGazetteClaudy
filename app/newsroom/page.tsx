'use client';

import { useMemo, useState } from 'react';
import NewsCard from '@/components/NewsCard';
import { Skeletons } from '@/components/NewsSection';
import { useStore } from '@/components/Providers';
import { useApi } from '@/lib/client';
import type { Article } from '@/lib/types';

type Scope = 'top' | 'watchlist' | 'ticker';

export default function NewsroomPage() {
  const { watchlist } = useStore();
  const [scope, setScope] = useState<Scope>('top');
  const [ticker, setTicker] = useState('AAPL');
  const [text, setText] = useState('');
  const [source, setSource] = useState('all');

  const symbol = ticker.trim().toUpperCase();
  const url =
    scope === 'top'
      ? '/api/news?scope=top&limit=80'
      : scope === 'watchlist'
        ? '/api/news?scope=watchlist&limit=80'
        : /^[A-Z0-9.\-]{1,10}$/.test(symbol)
          ? `/api/news?scope=ticker&symbol=${encodeURIComponent(symbol)}&limit=80`
          : null;
  const { data, loading, error, updatedAt } = useApi<Article[]>(url, 60000);

  const sources = useMemo(() => Array.from(new Set((data ?? []).map((a) => a.source))).sort(), [data]);
  const filtered = useMemo(() => {
    const q = text.trim().toLowerCase();
    return (data ?? []).filter(
      (a) => (source === 'all' || a.source === source) && (!q || `${a.headline} ${a.summary}`.toLowerCase().includes(q)),
    );
  }, [data, text, source]);

  return (
    <div className="page">
      <h1 className="page-title">Newsroom</h1>
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Stream">
          <button type="button" className={scope === 'top' ? 'active' : ''} onClick={() => setScope('top')}>
            Top
          </button>
          <button type="button" className={scope === 'watchlist' ? 'active' : ''} onClick={() => setScope('watchlist')}>
            Watchlist ({watchlist.length})
          </button>
          <button type="button" className={scope === 'ticker' ? 'active' : ''} onClick={() => setScope('ticker')}>
            Ticker
          </button>
        </div>
        {scope === 'ticker' && (
          <input className="input" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="Ticker" aria-label="Ticker" maxLength={10} />
        )}
        <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} placeholder="Filter headlines" aria-label="Filter headlines" />
        <select className="input" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Source">
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <p className="muted small">
        Live stream, refreshes every minute{updatedAt ? ` · updated ${new Date(updatedAt).toLocaleTimeString('en-US')}` : ''}
      </p>
      {loading && !data ? (
        <Skeletons n={5} />
      ) : error && !data ? (
        <p className="error">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="muted">No stories match.</p>
      ) : (
        <div className="stack">
          {filtered.map((a) => (
            <NewsCard key={a.id} article={a} variant="row" />
          ))}
        </div>
      )}
    </div>
  );
}
