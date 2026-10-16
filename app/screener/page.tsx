'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api, useApi } from '@/lib/client';
import { fmtCompactUsd, fmtDateTime, fmtNumber, fmtPct, fmtPrice, trend } from '@/lib/format';
import { filterRows, SCREENER_MAX, type ScreenerRow, type ScreenerSnapshot } from '@/lib/screen';
import { useStore } from '@/components/Providers';
import { Skeletons } from '@/components/NewsSection';
import { UNIVERSE_SECTORS } from '@/lib/universe';

type SortKey = 'momentum3m' | 'marketCap' | 'pe' | 'symbol';

const CAP_OPTIONS: { label: string; value: number }[] = [
  { label: 'Any size', value: 0 },
  { label: '$2B+', value: 2e9 },
  { label: '$10B+', value: 10e9 },
  { label: '$50B+', value: 50e9 },
  { label: '$200B+', value: 200e9 },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'momentum3m', label: '3-month momentum' },
  { key: 'marketCap', label: 'Market cap' },
  { key: 'pe', label: 'P/E (low first)' },
  { key: 'symbol', label: 'Symbol' },
];

function sortRows(rows: ScreenerRow[], key: SortKey): ScreenerRow[] {
  const out = [...rows];
  const desc = (v: number | null) => (v === null ? -Infinity : v);
  if (key === 'symbol') out.sort((a, b) => a.symbol.localeCompare(b.symbol));
  else if (key === 'pe') out.sort((a, b) => (a.pe ?? Infinity) - (b.pe ?? Infinity));
  else if (key === 'marketCap') out.sort((a, b) => desc(b.marketCap) - desc(a.marketCap));
  else out.sort((a, b) => desc(b.momentum3m) - desc(a.momentum3m));
  return out;
}

export default function ScreenerPage() {
  const { watchlist } = useStore();
  const { data, error, loading, reload } = useApi<ScreenerSnapshot | null>('/api/screener', 0);
  const [sector, setSector] = useState('');
  const [minCap, setMinCap] = useState(0);
  const [maxPe, setMaxPe] = useState('');
  const [minMomentum, setMinMomentum] = useState('');
  const [sort, setSort] = useState<SortKey>('momentum3m');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<ScreenerSnapshot | null>(null);
  const current = snapshot ?? data ?? null;

  const rows = useMemo(() => {
    if (!current) return [];
    const parsedPe = maxPe.trim() === '' ? undefined : Number(maxPe);
    const parsedMom = minMomentum.trim() === '' ? undefined : Number(minMomentum);
    return sortRows(
      filterRows(current.rows, {
        sector: sector || undefined,
        minMarketCap: minCap || undefined,
        maxPe: Number.isFinite(parsedPe) ? parsedPe : undefined,
        minMomentum: Number.isFinite(parsedMom) ? parsedMom : undefined,
      }),
      sort,
    );
  }, [current, sector, minCap, maxPe, minMomentum, sort]);

  const refresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      setSnapshot(await api<ScreenerSnapshot>('/api/screener', { method: 'POST' }));
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  const reset = () => {
    setSector('');
    setMinCap(0);
    setMaxPe('');
    setMinMomentum('');
  };

  return (
    <div className="page">
      <h1 className="page-title">Stock Screener</h1>

      <section className="card">
        <div className="section-head">
          <h2>Filters</h2>
          <div className="row-gap">
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Reset
            </button>
            <button type="button" className="btn" onClick={refresh} disabled={refreshing}>
              {refreshing ? 'Refreshing (up to a minute)...' : 'Refresh data'}
            </button>
          </div>
        </div>
        <div className="screen-filters">
          <label>
            <span className="muted small">Sector</span>
            <select className="input" value={sector} onChange={(e) => setSector(e.target.value)}>
              <option value="">All sectors</option>
              {UNIVERSE_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="Unclassified">Unclassified</option>
            </select>
          </label>
          <label>
            <span className="muted small">Market cap</span>
            <select className="input" value={minCap} onChange={(e) => setMinCap(Number(e.target.value))}>
              {CAP_OPTIONS.map((o) => (
                <option key={o.label} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="muted small">Max P/E</span>
            <input className="input" inputMode="decimal" placeholder="e.g. 30" value={maxPe} onChange={(e) => setMaxPe(e.target.value)} />
          </label>
          <label>
            <span className="muted small">Min 3-month move (%)</span>
            <input className="input" inputMode="decimal" placeholder="e.g. 0" value={minMomentum} onChange={(e) => setMinMomentum(e.target.value)} />
          </label>
          <label>
            <span className="muted small">Sort by</span>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted small">
          Universe: your {watchlist.length} watchlist tickers plus popular large US stocks, up to {SCREENER_MAX} in total. Market cap and P/E come from Finnhub; momentum from Yahoo Finance price history. Data is refreshed each weekday after the US close.
        </p>
        {refreshError && <p className="error" role="alert">{refreshError}</p>}
      </section>

      {loading && !current ? (
        <Skeletons n={2} />
      ) : error && !current ? (
        <p className="error">Could not load the screener: {error}</p>
      ) : !current ? (
        <section className="card">
          <p className="muted">No data yet. Press Refresh data to build the first snapshot (about 45 seconds).</p>
        </section>
      ) : (
        <section className="card">
          <div className="section-head">
            <h2>
              {rows.length} of {current.rows.length} stocks
            </h2>
            <span className="muted small">Snapshot {fmtDateTime(current.generatedAt)}</span>
          </div>
          {current.skipped.length > 0 && (
            <p className="muted small">Not included this run because of the rate limit: {current.skipped.join(', ')}.</p>
          )}
          {current.unavailable.length > 0 && (
            <details className="small">
              <summary>
                {current.unavailable.length} symbol{current.unavailable.length === 1 ? '' : 's'} could not be fully loaded
              </summary>
              <ul className="plain">
                {current.unavailable.map((u) => (
                  <li key={u.symbol}>
                    <strong>{u.symbol}</strong>: {u.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {rows.length === 0 ? (
            <p className="muted">No stocks match these filters.{current.rows.length === 0 ? ' The last snapshot had no data.' : ''}</p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Sector</th>
                    <th className="num">Price</th>
                    <th className="num">Market cap</th>
                    <th className="num">P/E</th>
                    <th className="num">3-month</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.symbol}>
                      <td>
                        <Link href={`/stock/${encodeURIComponent(r.symbol)}`} className="sym">
                          {r.symbol}
                        </Link>
                        {r.source === 'watchlist' && <span className="badge small"> watch</span>}
                      </td>
                      <td>{r.sector}</td>
                      <td className="num">{fmtPrice(r.price)}</td>
                      <td className="num">{fmtCompactUsd(r.marketCap)}</td>
                      <td className="num">{fmtNumber(r.pe)}</td>
                      <td className="num">
                        <span className={`pill ${trend(r.momentum3m)}`}>{fmtPct(r.momentum3m)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted small">Not investment advice. Figures can be delayed or incomplete; check the stock page before acting.</p>
        </section>
      )}
    </div>
  );
}
