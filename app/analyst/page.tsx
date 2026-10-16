'use client';

import { useState } from 'react';
import AnalystPanel from '@/components/AnalystPanel';
import { useStore } from '@/components/Providers';
import SymbolSearch from '@/components/SymbolSearch';

export default function AnalystPage() {
  const { watchlist } = useStore();
  const [symbol, setSymbol] = useState('NVDA');

  return (
    <div className="page">
      <h1 className="page-title">AI Analyst</h1>
      <p className="muted">Pick any ticker and generate an executive research brief with Gemini.</p>
      <div className="toolbar">
        <SymbolSearch placeholder="Choose a ticker" onPick={setSymbol} />
        <div className="chips">
          {watchlist.map((s) => (
            <button key={s} type="button" className={`chip ${s === symbol ? 'active' : ''}`} onClick={() => setSymbol(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <AnalystPanel symbol={symbol} />
    </div>
  );
}
