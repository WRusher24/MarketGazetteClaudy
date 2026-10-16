'use client';

import { useEffect, useState } from 'react';
import { LIST_NAME_MAX } from '@/lib/watchlist';
import { useStore } from './Providers';

/** Chooses the active watchlist and creates, renames or deletes lists. */
export default function ListManager({ activeId, onSelect }: { activeId: number | null; onSelect: (id: number) => void }) {
  const { lists, createList, renameList, deleteList } = useStore();
  const [newName, setNewName] = useState('');
  const [renameTo, setRenameTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = lists.find((l) => l.id === activeId) ?? lists[0] ?? null;

  useEffect(() => {
    setRenameTo(active?.name ?? '');
  }, [active?.id, active?.name]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="list-manager">
      <div className="chips" role="tablist" aria-label="Watchlists">
        {lists.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={l.id === active?.id}
            className={`chip ${l.id === active?.id ? 'active' : ''}`}
            onClick={() => onSelect(l.id)}
          >
            {l.name} ({l.symbols.length})
          </button>
        ))}
      </div>

      <div className="list-actions">
        <form
          className="list-form"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            run(async () => {
              const created = await createList(name);
              setNewName('');
              onSelect(created.id);
            });
          }}
        >
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New watchlist name"
            maxLength={LIST_NAME_MAX}
            aria-label="New watchlist name"
          />
          <button type="submit" className="btn btn-ghost" disabled={busy || !newName.trim()}>
            Create
          </button>
        </form>

        {active && (
          <form
            className="list-form"
            onSubmit={(e) => {
              e.preventDefault();
              const name = renameTo.trim();
              if (!name || name === active.name) return;
              run(() => renameList(active.id, name));
            }}
          >
            <input
              className="input"
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
              maxLength={LIST_NAME_MAX}
              aria-label="Rename watchlist"
            />
            <button type="submit" className="btn btn-ghost" disabled={busy || !renameTo.trim() || renameTo.trim() === active.name}>
              Rename
            </button>
            <button
              type="button"
              className="icon-btn"
              disabled={busy || lists.length <= 1}
              title={lists.length <= 1 ? 'Keep at least one watchlist' : `Delete ${active.name}`}
              aria-label={`Delete ${active.name}`}
              onClick={() => {
                const ok = window.confirm(
                  `Delete "${active.name}" and its ${active.symbols.length} tickers? This cannot be undone.`,
                );
                if (ok) run(() => deleteList(active.id).then(() => undefined));
              }}
            >
              🗑
            </button>
          </form>
        )}
      </div>
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  );
}
