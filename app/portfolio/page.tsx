'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AllocationChart from '@/components/AllocationChart';
import Icon from '@/components/Icon';
import PerformanceChart from '@/components/PerformanceChart';
import { api, useApi } from '@/lib/client';
import { fmtCompactUsd, fmtDateTime, fmtNumber, fmtPct, fmtPrice, trend } from '@/lib/format';
import { allocationBy, type Lot, type PortfolioTotals, type Position } from '@/lib/portfolio';
import type { PerfPoint } from '@/lib/performance';

interface PortfolioView {
  asOf: string;
  lots: Lot[];
  positions: Position[];
  totals: PortfolioTotals;
}
interface Performance {
  benchmark: string;
  points: PerfPoint[];
  excludedLots: number;
  missingHistory: string[];
  unavailable: string[];
}

const money = (n: number | null) => (n === null ? '--' : `${n >= 0 ? '+' : '-'}${fmtPrice(Math.abs(n))}`);

function Stat({ label, value, sub, cls = '' }: { label: string; value: string; sub?: string; cls?: string }) {
  return (
    <div className="metric">
      <span className="muted small">{label}</span>
      <strong className={cls}>{value}</strong>
      {sub && <span className={`small ${cls}`}>{sub}</span>}
    </div>
  );
}

function AddHolding({ onAdded }: { onAdded: () => void }) {
  const [symbol, setSymbol] = useState('');
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/holdings', {
        method: 'POST',
        body: JSON.stringify({ symbol, shares: Number(shares), costPerShare: Number(cost), acquiredOn: date || null }),
      });
      setSymbol('');
      setShares('');
      setCost('');
      setDate('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the holding');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="holding-form" onSubmit={submit}>
      <label>
        <span className="muted small">Ticker</span>
        <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="AAPL" required maxLength={15} />
      </label>
      <label>
        <span className="muted small">Shares</span>
        <input className="input" inputMode="decimal" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="10" required />
      </label>
      <label>
        <span className="muted small">Cost per share ($)</span>
        <input className="input" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="150.00" required />
      </label>
      <label>
        <span className="muted small">Purchase date (optional)</span>
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
      </label>
      <button type="submit" className="btn" disabled={busy}>
        <Icon name="plus" size={16} /> {busy ? 'Adding...' : 'Add holding'}
      </button>
      {error && <p className="error small" role="alert">{error}</p>}
    </form>
  );
}

export default function PortfolioPage() {
  const { data, error, loading, reload } = useApi<PortfolioView>('/api/portfolio', 60000);
  const hasLots = (data?.lots.length ?? 0) > 0;
  const perf = useApi<Performance>(hasLots ? '/api/portfolio/performance' : null, 0);
  const [mode, setMode] = useState<'sector' | 'position'>('sector');
  const [actionError, setActionError] = useState<string | null>(null);
  const allocation = useMemo(() => (data ? allocationBy(data.positions, mode) : []), [data, mode]);

  const removeLot = async (id: number) => {
    setActionError(null);
    try {
      await api(`/api/holdings?id=${id}`, { method: 'DELETE' });
      reload();
      perf.reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not remove the holding');
    }
  };

  const t = data?.totals;
  const dayTrend = trend(t?.dayChange);
  const gainTrend = trend(t?.gain);
  const pp = perf.data;
  const last = pp?.points[pp.points.length - 1];
  const portRet = last ? ((last.portfolio - last.invested) / last.invested) * 100 : null;
  const benchRet = last ? ((last.benchmark - last.invested) / last.invested) * 100 : null;

  return (
    <div className="page">
      <h1 className="page-title">Portfolio</h1>
      <p className="muted small">
        Holdings are stored in your database and are not linked to any broker. Valuations use live quotes, which can be delayed. Informational only, not investment advice.
      </p>

      <section className="card">
        <div className="section-head">
          <h2>Summary</h2>
          {data && <span className="muted small">Prices as of {fmtDateTime(data.asOf)}</span>}
        </div>
        {loading && !data ? (
          <div className="skeleton" style={{ height: 90 }} />
        ) : error && !data ? (
          <p className="error">Could not load the portfolio: {error}</p>
        ) : !data || !hasLots ? (
          <p className="muted">No holdings yet. Add your first position below.</p>
        ) : (
          <>
            <div className="metrics">
              <Stat label="Market value" value={fmtCompactUsd(t!.value)} />
              <Stat label="Cost basis" value={fmtCompactUsd(t!.cost)} />
              <Stat
                label="Total gain / loss"
                value={money(t!.gain)}
                sub={t!.gainPct === null ? undefined : fmtPct(t!.gainPct)}
                cls={gainTrend}
              />
              <Stat label="Today" value={money(t!.dayChange)} cls={dayTrend} />
            </div>
            {t!.unpriced.length > 0 && (
              <p className="error small" role="status">
                Not included in these totals because no live price loaded: {t!.unpriced.join(', ')}. Try again shortly.
              </p>
            )}
          </>
        )}
        {actionError && <p className="error small" role="alert">{actionError}</p>}
      </section>

      <section className="card">
        <div className="section-head">
          <h2>Add a holding</h2>
        </div>
        <AddHolding onAdded={() => reload()} />
      </section>

      {data && data.positions.length > 0 && (
        <section className="card">
          <div className="section-head">
            <h2>Positions</h2>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th className="num">Shares</th>
                  <th className="num">Avg cost</th>
                  <th className="num">Price</th>
                  <th className="num">Value</th>
                  <th className="num">Gain / loss</th>
                  <th className="num">Today</th>
                </tr>
              </thead>
              <tbody>
                {data.positions.map((p) => (
                  <tr key={p.symbol}>
                    <td>
                      <Link href={`/stock/${encodeURIComponent(p.symbol)}`} className="sym">
                        {p.symbol}
                      </Link>
                    </td>
                    <td className="num">{fmtNumber(p.shares)}</td>
                    <td className="num">{fmtPrice(p.avgCost)}</td>
                    <td className="num">{p.price === null ? '--' : fmtPrice(p.price)}</td>
                    <td className="num">{p.value === null ? '--' : fmtPrice(p.value)}</td>
                    <td className={`num ${trend(p.gain)}`}>
                      {p.gain === null ? '--' : `${money(p.gain)}${p.gainPct === null ? '' : ` (${fmtPct(p.gainPct)})`}`}
                    </td>
                    <td className={`num ${trend(p.dayChange)}`}>{money(p.dayChange)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {data && data.positions.length > 0 && (
        <section className="card">
          <div className="section-head">
            <h2>Allocation</h2>
            <div className="seg" role="group" aria-label="Allocation by">
              <button type="button" className={mode === 'sector' ? 'active' : ''} aria-pressed={mode === 'sector'} onClick={() => setMode('sector')}>
                Sector
              </button>
              <button type="button" className={mode === 'position' ? 'active' : ''} aria-pressed={mode === 'position'} onClick={() => setMode('position')}>
                Position
              </button>
            </div>
          </div>
          <AllocationChart slices={allocation} label={mode} />
          <p className="muted small">Sectors come from the popular-stock list; other tickers show as Unclassified.</p>
        </section>
      )}

      {hasLots && (
        <section className="card">
          <div className="section-head">
            <h2>Performance vs S&amp;P 500</h2>
          </div>
          {perf.loading && !pp ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : perf.error && !pp ? (
            <p className="error">Performance unavailable: {perf.error}</p>
          ) : pp && pp.points.length > 0 ? (
            <>
              <div className="metrics">
                <Stat label="Portfolio return" value={portRet === null ? '--' : fmtPct(portRet)} cls={trend(portRet)} />
                <Stat label="S&P 500, same money" value={benchRet === null ? '--' : fmtPct(benchRet)} cls={trend(benchRet)} />
                <Stat
                  label="Difference"
                  value={portRet === null || benchRet === null ? '--' : fmtPct(portRet - benchRet)}
                  cls={trend(portRet !== null && benchRet !== null ? portRet - benchRet : null)}
                />
              </div>
              <PerformanceChart points={pp.points} />
            </>
          ) : (
            <p className="muted">Performance needs at least one holding with a purchase date.</p>
          )}
          {pp && (
            <div className="muted small">
              <p>
                Each purchase is compared with putting the same money into the S&amp;P 500 on that day. Lots bought before five years of history
                are priced from the first available day.
              </p>
              {pp.excludedLots > 0 && <p>{pp.excludedLots} lot(s) have no purchase date and are left out of this chart.</p>}
              {(pp.missingHistory.length > 0 || pp.unavailable.length > 0) && (
                <p>
                  No price history for: {Array.from(new Set([...pp.missingHistory, ...pp.unavailable])).join(', ')}. Those lots are held at cost.
                </p>
              )}
            </div>
          )}
          {perf.error && pp && <p className="error small">Could not refresh performance: {perf.error}</p>}
        </section>
      )}

      {data && data.lots.length > 0 && (
        <section className="card">
          <div className="section-head">
            <h2>Lots</h2>
          </div>
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th className="num">Shares</th>
                  <th className="num">Cost / share</th>
                  <th>Bought</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {data.lots.map((l) => (
                  <tr key={l.id}>
                    <td className="sym">{l.symbol}</td>
                    <td className="num">{fmtNumber(l.shares)}</td>
                    <td className="num">{fmtPrice(l.costPerShare)}</td>
                    <td>{l.acquiredOn ?? <span className="muted">not entered</span>}</td>
                    <td className="num">
                      <button type="button" className="icon-btn" onClick={() => removeLot(l.id)} aria-label={`Remove ${l.symbol} lot`}>
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
