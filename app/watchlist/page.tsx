'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ReportBody } from '@/components/AnalystPanel';
import EarningsCalendar from '@/components/EarningsCalendar';
import Icon from '@/components/Icon';
import LibraryTools from '@/components/LibraryTools';
import ListManager from '@/components/ListManager';
import { useReader, useStore } from '@/components/Providers';
import SymbolSearch from '@/components/SymbolSearch';
import TagEditor from '@/components/TagEditor';
import WatchTable from '@/components/WatchTable';
import { api, useApi } from '@/lib/client';
import { fmtDateTime } from '@/lib/format';
import { allTags, matchesQuery } from '@/lib/library';
import type { AnalystReport, Highlight, Note } from '@/lib/types';

type Tab = 'tickers' | 'vault' | 'notes';

function Vault({ query, tag }: { query: string; tag: string | null }) {
  const { bookmarks, removeBookmark, setBookmarkTags } = useStore();
  const { openArticle } = useReader();
  const [open, setOpen] = useState<string | null>(null);
  const highlights = useApi<Highlight[]>('/api/highlights', 0);
  const [error, setError] = useState<string | null>(null);

  const shown = bookmarks.filter((b) =>
    matchesQuery({ text: `${b.title} ${b.summary} ${b.source} ${b.symbol}`, tags: b.tags }, query, tag),
  );
  const shownHighlights = (highlights.data ?? []).filter((h) => matchesQuery({ text: `${h.body} ${h.articleTitle} ${h.symbol}`, tags: [] }, query, null));

  return (
    <>
      <div className="section-head">
        <span className="muted small">
          {shown.length} of {bookmarks.length} saved items
        </span>
        <Link href="/export" className="btn btn-ghost">
          <Icon name="note" size={16} /> Export
        </Link>
      </div>
      {error && <p className="error small" role="alert">{error}</p>}
      {!bookmarks.length ? (
        <p className="muted">Nothing saved yet. Use the bookmark button in the reader or on an AI report.</p>
      ) : !shown.length ? (
        <p className="muted">No saved items match this search or tag.</p>
      ) : (
        <ul className="vault">
          {shown.map((b) => {
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
                <TagEditor tags={b.tags} label={b.title} onSave={(tags) => setBookmarkTags(b.key, tags)} />
                {report && open === b.key && <ReportBody report={report} />}
              </li>
            );
          })}
        </ul>
      )}

      <section className="card">
        <div className="section-head">
          <h2>Highlights</h2>
        </div>
        {highlights.loading && !highlights.data ? (
          <div className="skeleton" style={{ height: 60 }} />
        ) : highlights.error && !highlights.data ? (
          <p className="error small">Could not load highlights: {highlights.error}</p>
        ) : !shownHighlights.length ? (
          <p className="muted small">Highlights you save in the reader appear here.</p>
        ) : (
          <ul className="plain highlight-list">
            {shownHighlights.map((h) => (
              <li key={h.id}>
                <blockquote>{h.body}</blockquote>
                <div className="note-meta muted small">
                  <span>
                    {h.articleUrl ? (
                      <a href={h.articleUrl} target="_blank" rel="noopener noreferrer">
                        {h.articleTitle || 'Untitled story'}
                      </a>
                    ) : (
                      h.articleTitle || 'Untitled story'
                    )}{' '}
                    · {fmtDateTime(h.createdAt)}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Delete highlight"
                    onClick={() =>
                      api(`/api/highlights?id=${h.id}`, { method: 'DELETE' })
                        .then(() => highlights.reload())
                        .catch((e) => setError(e instanceof Error ? e.message : 'Could not delete the highlight'))
                    }
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function AllNotes({ query, tag }: { query: string; tag: string | null }) {
  const { data, error, loading, reload } = useApi<Note[]>('/api/notes');
  const [saveError, setSaveError] = useState<string | null>(null);
  const notes = data ?? [];
  const tags = useMemo(() => allTags(notes), [notes]);
  const shown = notes.filter((n) =>
    matchesQuery({ text: `${n.body} ${n.symbol} ${n.articleTitle ?? ''}`, tags: n.tags }, query, tag),
  );

  if (loading && !data) return <div className="skeleton" style={{ height: 100 }} />;
  if (error && !data) return <p className="error">Could not load notes: {error}</p>;
  if (!notes.length) return <p className="muted">No notes yet. Open any stock page or a story in the reader to write one.</p>;
  return (
    <>
      <p className="muted small">{shown.length} of {notes.length} notes{tags.length ? ` · tags: ${tags.map((t) => `#${t}`).join(' ')}` : ''}</p>
      {saveError && <p className="error small" role="alert">{saveError}</p>}
      {!shown.length && <p className="muted">No notes match this search or tag.</p>}
      <ul className="notes">
        {shown.map((n) => (
          <li key={n.id}>
            <Link href={`/stock/${encodeURIComponent(n.symbol)}`} className="sym">
              {n.symbol}
            </Link>
            {n.articleTitle && (
              <span className="muted small">
                {' '}· re:{' '}
                {n.articleUrl ? (
                  <a href={n.articleUrl} target="_blank" rel="noopener noreferrer">
                    {n.articleTitle}
                  </a>
                ) : (
                  n.articleTitle
                )}
              </span>
            )}
            <p>{n.body}</p>
            <TagEditor
              tags={n.tags}
              label={`note on ${n.symbol}`}
              onSave={async (next) => {
                try {
                  await api('/api/notes', { method: 'PUT', body: JSON.stringify({ id: n.id, tags: next }) });
                  setSaveError(null);
                  reload();
                } catch (e) {
                  setSaveError(e instanceof Error ? e.message : 'Could not save tags');
                  throw e;
                }
              }}
            />
            <span className="muted small">{fmtDateTime(n.updatedAt)}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function WatchlistPage() {
  const { lists, addSymbol, bookmarks } = useStore();
  const notesQuery = useApi<Note[]>('/api/notes');
  const [tab, setTab] = useState<Tab>('tickers');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const active = lists.find((l) => l.id === (activeId ?? lists[0]?.id)) ?? null;
  const libraryTags = useMemo(() => allTags([...bookmarks, ...(notesQuery.data ?? [])]), [bookmarks, notesQuery.data]);

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
        <>
          <section className="card">
            <div className="section-head">
              <h2>{active ? active.name : 'My Tickers'}</h2>
              <SymbolSearch
                placeholder={active ? `Add to ${active.name}` : 'Add a ticker'}
                onPick={(s) =>
                  addSymbol(s, active?.id)
                    .then(() => setError(null))
                    .catch((e) => setError(e instanceof Error ? e.message : 'Could not add'))
                }
              />
            </div>
            <ListManager activeId={active?.id ?? null} onSelect={setActiveId} />
            {error && <p className="error">{error}</p>}
            <div className="list-table">
              <WatchTable editable listId={active?.id} />
            </div>
          </section>
          <EarningsCalendar symbols={active?.symbols ?? []} title={`Earnings: ${active?.name ?? 'Watchlist'}`} />
        </>
      )}

      {(tab === 'vault' || tab === 'notes') && (
        <section className="card">
          <LibraryTools query={query} onQuery={setQuery} tags={libraryTags} activeTag={tag} onTag={setTag} />
        </section>
      )}
      {tab === 'vault' && <Vault query={query} tag={tag} />}
      {tab === 'notes' && <AllNotes query={query} tag={tag} />}
    </div>
  );
}
