'use client';

import { useApi } from '@/lib/client';
import { fmtNumber, fmtPct, trend } from '@/lib/format';
import type { IndexQuote } from '@/lib/types';

export default function Ticker() {
  const { data } = useApi<IndexQuote[]>('/api/ticker', 30000);

  if (!data || data.length === 0) {
    return (
      <div className="ticker" aria-label="Market indices">
        <div className="ticker-empty">Loading market indices...</div>
      </div>
    );
  }

  const items = [...data, ...data];
  return (
    <div className="ticker" aria-label="Market indices">
      <div className="ticker-track">
        {items.map((q, i) => (
          <span className="ticker-item" key={`${q.symbol}-${i}`} aria-hidden={i >= data.length}>
            <span className="ticker-label">{q.label}</span>
            <span className="ticker-price">{fmtNumber(q.price)}</span>
            <span className={`chg ${trend(q.changePct)}`}>
              {trend(q.changePct) === 'up' ? '▲' : trend(q.changePct) === 'down' ? '▼' : '■'} {fmtPct(q.changePct)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
