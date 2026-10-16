'use client';

import { useApi } from '@/lib/client';
import { fmtNumber, fmtPrice, fmtVolume } from '@/lib/format';
import { hourLabel, type EarningsItem } from '@/lib/calendar';
import { Skeletons } from './NewsSection';

/** Upcoming earnings for the given symbols over the next three weeks. */
export default function EarningsCalendar({ symbols, title = 'Earnings Calendar' }: { symbols: string[]; title?: string }) {
  const url = symbols.length ? `/api/earnings?symbols=${encodeURIComponent(symbols.join(','))}` : null;
  const { data, error, loading, reload } = useApi<{ items: EarningsItem[] }>(url, 3600000);

  return (
    <section className="card">
      <div className="section-head">
        <h2>{title}</h2>
        <button type="button" className="link-btn" onClick={reload}>
          Refresh
        </button>
      </div>
      {!url ? (
        <p className="muted">Add tickers to see their upcoming earnings dates.</p>
      ) : loading && !data ? (
        <Skeletons n={1} />
      ) : error && !data ? (
        <p className="error">Earnings calendar unavailable: {error}</p>
      ) : !data?.items.length ? (
        <p className="muted">No earnings dates for these tickers in the next three weeks.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Symbol</th>
              <th>Timing</th>
              <th className="num">EPS est.</th>
              <th className="num">EPS actual</th>
              <th className="num">Revenue est.</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={`${i.symbol}-${i.date}`}>
                <td>{i.date}</td>
                <td className="sym">{i.symbol}</td>
                <td>{hourLabel(i.hour)}</td>
                <td className="num">{i.epsEstimate === null ? '--' : fmtPrice(i.epsEstimate)}</td>
                <td className="num">{i.epsActual === null ? '--' : fmtPrice(i.epsActual)}</td>
                <td className="num">{i.revenueEstimate === null ? '--' : fmtVolume(i.revenueEstimate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted small">Dates come from Finnhub and can change. Estimates are consensus figures, not guidance.</p>
    </section>
  );
}
