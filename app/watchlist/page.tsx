'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ReportBody } from '@/components/AnalystPanel';
import Icon from '@/components/Icon';
import { useReader, useStore } from '@/components/Providers';
import SymbolSearch from '@/components/SymbolSearch';
import WatchTable from '@/components/WatchTable';
import { useApi } from '@/lib/client';
import { fmtDateTime } from '@/lib/format';
import type { AnalystReport, Note } from '@/lib/types';

type Tab = 'tickers' | 'vault' | 'notes';

function Vault() {
  const { bookmarks, removeBookmark } = useStore();
  const { openArticle } = useReader();
  const [open, setOpen] = useState<string | null>(null);

  if (!bookmarks.length) {
    return <p className="muted">Nothing saved yet. Use the bookmark button in the reader or on an AI report.</p>;
  }
  return (
    <ul className="vault">
      {bookmarks.map((b) => {
        let report: AnalystReport | null = null;
        if (b.kind === 'report') {
          try {
            report = JSON.parse(b.body) as AnalystReport;
          } catch {
            report = null;
          }
        }
        return (
          <li key={b.key} className="card">
            <div className="news-meta">
              <span className="badge">{b.kind === 'report' ? 'AI Report' : b.source}</span>
              <span className="muted small">{fmtDateTime(b.savedAt)}</span>
              <span className="spacer" />
              <button type="button" className="icon-btn" onClick={() => removeBookmark(b.key).catch(() => undefined)} aria-label="Remove from vault">
                <Icon name="trash" size={16} />
              </button>
            </div>
            <h3>
              {b.kind === 'article' ? (
                <button
                  type="button"
                  className="link-btn title-btn"
                  onClick={() =>
                    openArticle({
                      id: b.key,
                      headline: b.title,
                      summary: b.summary,
                      source: b.source,
                      url: b.url,
                      image: b.image,
                      publishedAt: b.savedAt,
                      related: b.symbol ? [b.symbol] : [],
                      category: 'saved',
                    })
                  }
                >
                  {b.title}
                </button>
              ) : (
                <button type="button" className="link-btn title-btn" onClick={() => setOpen(open === b.key ? null : b.key)}>
                  {b.title}
                </button>
              )}
            </h3>
            {report && open === b.key && <ReportBody report={report} />}
          </li>
        );
      })}
    </ul>
  );
}

function AllNotes() {
  const { data, loading } = useApi<Note[]>('/api/notes');
  if (loading && !data) return <div className="skeleton" style={{ height: 100 }} />;
  if (!data?.length) return <p className="muted">No notes yet. Open any stock page to write one.</p>;
  return (
    <ul className="notes">
      {data.map((n) => (
        <li key={n.id}>
          <Link href={`/stock/${encodeURIComponent(n.symbol)}`} className="sym">
            {n.symbol}
          </Link>
          <p>{n.body}</p>
          <span className="muted small">{fmtDateTime(n.updatedAt)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function WatchlistPage() {
  const { addSymbol, bookmarks } = useStore();
  const [tab, setTab] = useState<Tab>('tickers');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="page">
      <h1 className="page-title">Watchlist</h1>
      <div className="seg" role="tablist">
        <button type="button" className={tab === 'tickers' ? 'active' : ''} onClick={() => setTab('tickers')}>
          Tickers
        </button>
        <button type="button" className={tab === 'vault' ? 'active' : ''} onClick={() => setTab('vault')}>
          Saved Vault ({bookmarks.length})
        </button>
        <button type="button" className={tab === 'notes' ? 'active' : ''} onClick={() => setTab('notes')}>
          Notes
        </button>
      </div>

      {tab === 'tickers' && (
        <section className="card">
          <div className="section-head">
            <h2>My Tickers</h2>
            <SymbolSearch
              placeholder="Add a ticker"
              onPick={(s) => addSymbol(s).then(() => setError(null)).catch((e) => setError(e instanceof Error ? e.message : 'Could not add'))}
            />
          </div>
          {error && <p className="error">{error}</p>}
          <WatchTable editable />
        </section>
      )}
      {tab === 'vault' && <Vault />}
      {tab === 'notes' && <AllNotes />}
    </div>
  );
}
