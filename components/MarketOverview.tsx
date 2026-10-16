'use client';

import Link from 'next/link';
import { useApi } from '@/lib/client';
import { fmtNumber, fmtPct, fmtPrice, trend } from '@/lib/format';
import type { MarketOverview as Overview, MarketQuote } from '@/lib/market';
import { Skeletons } from './NewsSection';

const SHORT = 6;

/** Background tint for a sector tile: theme colours mixed by how big the move was. */
export function heatStyle(changePct: number): React.CSSProperties {
  const strength = Math.min(0.75, Math.abs(changePct) / 3);
  const tone = changePct >= 0 ? 'var(--up)' : 'var(--down)';
  return strength < 0.03
    ? { background: 'var(--panel-2)' }
    : { background: `color-mix(in srgb, ${tone} ${Math.round(strength * 100)}%, var(--panel-2))` };
}

function Movers({ title, items, empty }: { title: string; items: MarketQuote[]; empty: string }) {
  return (
    <div>
      <h4 className={title === 'Top gainers' ? 'up' : 'down'}>{title}</h4>
      {items.length === 0 ? (
        <p className="muted small">{empty}</p>
      ) : (
        <table className="table">
          <tbody>
            {items.map((q) => (
              <tr key={q.symbol}>
                <td>
                  <Link href={`/stock/${encodeURIComponent(q.symbol)}`} className="sym">
                    {q.symbol}
                  </Link>
                </td>
                <td className="num">{fmtPrice(q.price)}</td>
                <td className="num">
                  <span className={`pill ${trend(q.changePct)}`}>{fmtPct(q.changePct)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function MarketOverview() {
  const { data, error, loading, reload } = useApi<Overview>('/api/market', 300000);

  return (
    <section className="section">
      <div className="section-head">
        <h2>Market Overview</h2>
        <button type="button" className="link-btn" onClick={reload}>
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <Skeletons n={2} />
      ) : error && !data ? (
        <p className="error">Market data is unavailable right now: {error}</p>
      ) : !data ? null : (
        <div className="stack">
          {data.unavailable.length > 0 && (
            <p className="muted small" role="status">
              Showing partial data: {data.unavailable.length} of {data.universeSize + data.indices.length + data.sectors.length} quotes could not be loaded
              ({data.unavailable.slice(0, SHORT).join(', ')}
              {data.unavailable.length > SHORT ? ', ...' : ''}).
            </p>
          )}

          <div className="index-grid">
            {data.indices.map((q) => (
              <div className="metric" key={q.symbol}>
                <span className="muted small">{q.label}</span>
                <strong>{fmtNumber(q.price)}</strong>
                <span className={`chg ${trend(q.changePct)}`}>{fmtPct(q.changePct)}</span>
              </div>
            ))}
          </div>

          <div>
            <h4>Sector heat map</h4>
            <div className="heat-grid">
              {data.sectors.map((q) => (
                <div className="heat-tile" key={q.symbol} style={heatStyle(q.changePct)} title={`${q.label} (${q.symbol})`}>
                  <span className="small">{q.label}</span>
                  <strong className={trend(q.changePct)}>{fmtPct(q.changePct)}</strong>
                </div>
              ))}
            </div>
            <p className="muted small">Sector ETF day change. Colour depth shows the size of the move.</p>
          </div>

          <div className="movers-grid">
            <Movers title="Top gainers" items={data.gainers} empty="No gainers among the tracked stocks today." />
            <Movers title="Top losers" items={data.losers} empty="No losers among the tracked stocks today." />
          </div>
          <p className="muted small">Tracked universe: {data.universeSize} large US stocks. Quotes from Yahoo Finance, cached about five minutes.</p>
        </div>
      )}
    </section>
  );
}
