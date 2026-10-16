'use client';

import { useState } from 'react';
import { useStore } from './Providers';

/** Shows which watchlists hold a symbol and lets the user toggle each one. */
export default function ListMembership({ symbol }: { symbol: string }) {
  const { lists, addSymbol, removeSymbol } = useStore();
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (listId: number, inList: boolean) => {
    setPending(listId);
    setError(null);
    try {
      if (inList) await removeSymbol(symbol, listId);
      else await addSymbol(symbol, listId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the watchlist');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="list-membership">
      <span className="muted small">Watchlists</span>
      <div className="chips">
        {lists.map((l) => {
          const inList = l.symbols.includes(symbol);
          return (
            <button
              key={l.id}
              type="button"
              className={`chip ${inList ? 'active' : ''}`}
              aria-pressed={inList}
              disabled={pending === l.id}
              onClick={() => toggle(l.id, inList)}
            >
              {inList ? '✓ ' : '+ '}
              {l.name}
            </button>
          );
        })}
      </div>
      {error && <p className="error small" role="alert">{error}</p>}
    </div>
  );
}
