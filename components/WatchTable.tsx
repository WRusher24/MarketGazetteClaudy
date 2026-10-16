'use client';

import Link from 'next/link';
import { useApi } from '@/lib/client';
import { fmtChange, fmtPct, fmtPrice, trend } from '@/lib/format';
import type { Quote } from '@/lib/types';
import Icon from './Icon';
import { useStore } from './Providers';

export default function WatchTable({ editable = false }: { editable?: boolean }) {
  const { watchlist, ready, removeSymbol } = useStore();
  const url = watchlist.length ? `/api/quotes?symbols=${encodeURIComponent(watchlist.join(','))}` : null;
  const { data, loading } = useApi<Quote[]>(url, 15000);
  const quotes = new Map((data ?? []).map((q) => [q.symbol, q]));

  if (!ready) return <div className="skeleton" style={{ height: 140 }} />;
  if (!watchlist.length) {
    return <p className="muted">Your watchlist is empty. Search for a ticker above and add it to see live prices here.</p>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Symbol</th>
          <th className="num">Price</th>
          <th className="num">Change</th>
          <th className="num">% Change</th>
          {editable && <th aria-label="Actions" />}
        </tr>
      </thead>
      <tbody>
        {watchlist.map((s) => {
          const q = quotes.get(s);
          const t = trend(q?.changePct);
          return (
            <tr key={s}>
              <td>
                <Link href={`/stock/${encodeURIComponent(s)}`} className="sym">
                  {s}
                </Link>
              </td>
              <td className="num">{q ? fmtPrice(q.price) : loading ? '...' : '--'}</td>
              <td className={`num chg ${t}`}>{q ? fmtChange(q.change) : '--'}</td>
              <td className="num">
                <span className={`pill ${t}`}>{q ? fmtPct(q.changePct) : '--'}</span>
              </td>
              {editable && (
                <td className="num">
                  <button type="button" className="icon-btn" onClick={() => removeSymbol(s).catch(() => undefined)} aria-label={`Remove ${s}`}>
                    <Icon name="trash" size={16} />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
