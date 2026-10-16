'use client';

import { useApi } from '@/lib/client';
import { fmtNumber, fmtPrice } from '@/lib/format';
import type { InsiderTrade, RatingChange } from '@/lib/insider';
import { Skeletons } from './NewsSection';

interface Part<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
interface Activity {
  symbol: string;
  insiders: Part<InsiderTrade[]>;
  ratings: Part<RatingChange[]>;
}

const fmtShares = (n: number | null) => (n === null ? '--' : `${n > 0 ? '+' : ''}${fmtNumber(n)}`);

/** Insider trades and analyst consensus changes. Each half shows its own error if its source is unavailable. */
export default function ActivityPanel({ symbol }: { symbol: string }) {
  const { data, error, loading, reload } = useApi<Activity>(`/api/stock/${encodeURIComponent(symbol)}/activity`, 0);

  return (
    <section className="card">
      <div className="section-head">
        <h2>Insider Trades &amp; Analyst Ratings</h2>
        <button type="button" className="link-btn" onClick={reload}>
          Refresh
        </button>
      </div>
      {loading && !data ? (
        <Skeletons n={1} />
      ) : error && !data ? (
        <p className="error">Could not load activity: {error}</p>
      ) : data ? (
        <div className="activity-grid">
          <div>
            <h4>Insider transactions</h4>
            {!data.insiders.ok ? (
              <p className="error small">Insider trades unavailable: {data.insiders.error}</p>
            ) : !data.insiders.data?.length ? (
              <p className="muted small">No recent insider transactions reported.</p>
            ) : (
              <div className="table-scroll">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Insider</th>
                      <th>Type</th>
                      <th className="num">Shares</th>
                      <th className="num">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.insiders.data.map((t, i) => (
                      <tr key={`${t.date}-${t.name}-${i}`}>
                        <td>{t.date}</td>
                        <td>{t.name}</td>
                        <td>{t.codeLabel}</td>
                        <td className={`num ${t.shares !== null && t.shares < 0 ? 'down' : t.shares ? 'up' : ''}`}>{fmtShares(t.shares)}</td>
                        <td className="num">{t.price === null ? '--' : fmtPrice(t.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div>
            <h4>Analyst consensus changes</h4>
            {!data.ratings.ok ? (
              <p className="error small">Analyst ratings unavailable: {data.ratings.error}</p>
            ) : !data.ratings.data?.length ? (
              <p className="muted small">No change in the monthly analyst consensus.</p>
            ) : (
              <ul className="plain">
                {data.ratings.data.map((r) => (
                  <li key={r.period}>
                    <span className="muted small">{r.period}</span>{' '}
                    <span className={r.direction === 'up' ? 'up' : 'down'}>
                      {r.direction === 'up' ? '▲' : '▼'} {r.from} → {r.to}
                    </span>{' '}
                    <span className="muted small">(score {r.previousScore.toFixed(2)} → {r.score.toFixed(2)})</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted small">
              Built from Finnhub's monthly analyst trend data. Individual broker actions are not included.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
