'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDateTime } from '@/lib/format';
import type { Article, Highlight, Note } from '@/lib/types';
import Icon from './Icon';

/** Highlights and notes that belong to one article. Highlights come from the selected text in the reader. */
export default function StoryWorkbench({ article, selection, onSaved }: { article: Article; selection: string; onSaved: () => void }) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState('');
  const [noteSymbol, setNoteSymbol] = useState(article.related[0] ?? '');
  const articleParams = `article=${encodeURIComponent(article.id)}`;

  useEffect(() => {
    let alive = true;
    setHighlights([]);
    setNotes([]);
    setLoadError(null);
    setNoteSymbol(article.related[0] ?? '');
    Promise.all([api<Highlight[]>(`/api/highlights?${articleParams}`), api<Note[]>(`/api/notes?${articleParams}`)])
      .then(([h, n]) => {
        if (!alive) return;
        setHighlights(h);
        setNotes(n);
      })
      .catch((e) => alive && setLoadError(e instanceof Error ? e.message : 'Could not load your highlights and notes'));
    return () => {
      alive = false;
    };
  }, [article.id, articleParams, article.related]);

  const saveHighlight = async () => {
    setError(null);
    try {
      const h = await api<Highlight>('/api/highlights', {
        method: 'POST',
        body: JSON.stringify({ articleId: article.id, articleTitle: article.headline, articleUrl: article.url, symbol: article.related[0] ?? '', body: selection }),
      });
      setHighlights((prev) => [h, ...prev]);
      onSaved();
      window.getSelection()?.removeAllRanges();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the highlight');
    }
  };

  const removeHighlight = async (id: number) => {
    try {
      await api(`/api/highlights?id=${id}`, { method: 'DELETE' });
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the highlight');
    }
  };

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const n = await api<Note>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          symbol: noteSymbol,
          body: noteBody,
          articleId: article.id,
          articleTitle: article.headline,
          articleUrl: article.url,
        }),
      });
      setNotes((prev) => [n, ...prev]);
      setNoteBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the note');
    }
  };

  return (
    <section className="story-workbench">
      {selection && (
        <div className="highlight-bar" role="status">
          <span className="small">“{selection.length > 120 ? `${selection.slice(0, 120)}...` : selection}”</span>
          <button type="button" className="btn" onClick={saveHighlight}>
            <Icon name="bookmark" size={16} /> Save highlight
          </button>
        </div>
      )}

      {loadError && <p className="error small">{loadError}</p>}
      {error && <p className="error small" role="alert">{error}</p>}

      <h4>Your highlights</h4>
      {highlights.length === 0 ? (
        <p className="muted small">Select a passage in the article above, then press Save highlight.</p>
      ) : (
        <ul className="plain highlight-list">
          {highlights.map((h) => (
            <li key={h.id}>
              <blockquote>{h.body}</blockquote>
              <div className="note-meta muted small">
                <span>{fmtDateTime(h.createdAt)}</span>
                <button type="button" className="icon-btn" onClick={() => removeHighlight(h.id)} aria-label="Delete highlight">
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h4>Thesis notes on this story</h4>
      <form className="note-form" onSubmit={addNote}>
        <input
          className="input"
          value={noteSymbol}
          onChange={(e) => setNoteSymbol(e.target.value.toUpperCase())}
          placeholder="Ticker, e.g. NVDA"
          aria-label="Ticker for this note"
          maxLength={15}
          required
        />
        <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="What does this story change in your thesis?" rows={3} maxLength={5000} required />
        <button className="btn" type="submit" disabled={!noteBody.trim() || !noteSymbol.trim()}>
          <Icon name="plus" size={16} /> Add note
        </button>
      </form>
      <ul className="notes">
        {notes.map((n) => (
          <li key={n.id}>
            <p>{n.body}</p>
            <span className="muted small">
              {n.symbol} · {fmtDateTime(n.createdAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
