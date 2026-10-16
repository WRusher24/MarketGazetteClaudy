'use client';

import { useApi } from '@/lib/client';
import { fmtChange, fmtCompactUsd, fmtNumber, fmtPct, fmtPlainPct, fmtPrice, fmtVolume, trend } from '@/lib/format';
import type { StockDetail } from '@/lib/types';
import AnalystPanel from './AnalystPanel';
import Icon from './Icon';
import NewsSection from './NewsSection';
import Notes from './Notes';
import { useStore } from './Providers';
import StockChart from './StockChart';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function StockView({ symbol }: { symbol: string }) {
  const { data: s, error, loading } = useApi<StockDetail>(`/api/stock/${encodeURIComponent(symbol)}`, 15000);
  const { watchlist, addSymbol, removeSymbol } = useStore();
  const watching = watchlist.includes(symbol);
  const t = trend(s?.changePct);

  if (loading && !s) return <div className="skeleton" style={{ height: 120 }} />;
  if (error && !s) return <p className="error">{error}</p>;
  if (!s) return null;

  return (
    <div className="stock">
      <header className="card stock-head">
        <div className="stock-id">
          {s.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo} alt="" className="logo" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1>
              {s.symbol} <span className="muted">{s.name}</span>
            </h1>
            <span className="muted small">{[s.exchange, s.industry].filter(Boolean).join(' · ')}</span>
          </div>
        </div>
        <div className="stock-price">
          <strong className="big">{fmtPrice(s.price)}</strong>
          <span className={`chg ${t}`}>{fmtChange(s.change)}</span>
          <span className={`pill ${t}`}>{fmtPct(s.changePct)}</span>
        </div>
        <button
          type="button"
          className={`btn ${watching ? 'btn-ghost' : ''}`}
          onClick={() => (watching ? removeSymbol(symbol) : addSymbol(symbol)).catch(() => undefined)}
        >
          <Icon name={watching ? 'trash' : 'plus'} size={16} /> {watching ? 'Remove from watchlist' : 'Add to watchlist'}
        </button>
      </header>

      <div className="stock-grid">
        <div className="stack">
          <StockChart symbol={symbol} />
          <section className="card">
            <div className="section-head">
              <h2>Key Metrics</h2>
            </div>
            <div className="metrics">
              <Metric label="Market Cap" value={fmtCompactUsd(s.marketCap)} />
              <Metric label="P/E Ratio" value={fmtNumber(s.pe)} />
              <Metric label="52-Week High" value={fmtPrice(s.high52)} />
              <Metric label="52-Week Low" value={fmtPrice(s.low52)} />
              <Metric label="Volume" value={fmtVolume(s.volume)} />
              <Metric label="Dividend Yield" value={fmtPlainPct(s.dividendYield)} />
              <Metric label="Open" value={fmtPrice(s.open)} />
              <Metric label="Day Range" value={`${fmtNumber(s.low)} - ${fmtNumber(s.high)}`} />
            </div>
          </section>
          <AnalystPanel symbol={symbol} />
          <Notes symbol={symbol} />
        </div>
        <aside className="stock-news">
          <NewsSection
            title={`${symbol} News`}
            url={`/api/news?scope=ticker&symbol=${encodeURIComponent(symbol)}`}
            variant="row"
            limit={20}
            empty={`No recent stories for ${symbol}.`}
          />
        </aside>
      </div>
    </div>
  );
}
