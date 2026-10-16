'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDateTime } from '@/lib/format';
import type { Note } from '@/lib/types';
import Icon from './Icon';

export default function Notes({ symbol }: { symbol: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<Note[]>(`/api/notes?symbol=${encodeURIComponent(symbol)}`)
      .then((n) => alive && setNotes(n))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load notes'));
    return () => {
      alive = false;
    };
  }, [symbol]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      const note = await api<Note>('/api/notes', { method: 'POST', body: JSON.stringify({ symbol, body: draft }) });
      setNotes((n) => [note, ...n]);
      setDraft('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note');
    }
  };

  const remove = async (id: number) => {
    try {
      await api(`/api/notes?id=${id}`, { method: 'DELETE' });
      setNotes((n) => n.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete note');
    }
  };

  return (
    <section className="card">
      <div className="section-head">
        <h2>My Notes</h2>
      </div>
      <form onSubmit={add} className="note-form">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Private note on ${symbol}, e.g. "Earnings call on Thursday"`} rows={3} maxLength={5000} />
        <button className="btn" type="submit" disabled={!draft.trim()}>
          <Icon name="plus" size={16} /> Add note
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="notes">
        {notes.map((n) => (
          <li key={n.id}>
            <p>{n.body}</p>
            <div className="note-meta muted small">
              <span>{fmtDateTime(n.createdAt)}</span>
              <button type="button" className="icon-btn" onClick={() => remove(n.id)} aria-label="Delete note">
                <Icon name="trash" size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
