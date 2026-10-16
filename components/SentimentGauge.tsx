'use client';

import { useApi } from '@/lib/client';
import type { SentimentRadar } from '@/lib/types';

export default function SentimentGauge() {
  const { data, loading, error } = useApi<SentimentRadar>('/api/sentiment', 600000);

  // score -100..100 maps to -90deg..90deg around the bottom centre of the semicircle
  const angle = data ? Math.max(-90, Math.min(90, (data.score / 100) * 90)) : 0;
  const cls = data ? (data.label === 'Bullish' ? 'up' : data.label === 'Bearish' ? 'down' : 'flat') : 'flat';

  return (
    <section className="card radar">
      <div className="section-head">
        <h2>AI Sentiment Radar</h2>
        {data && <span className="muted small">{data.method === 'ai' ? 'Gemini' : 'Keyword'} · {data.sample} stories</span>}
      </div>
      {loading && !data ? (
        <div className="skeleton" style={{ height: 150 }} />
      ) : error || !data ? (
        <p className="muted">Sentiment is unavailable right now.</p>
      ) : (
        <>
          <svg viewBox="0 0 200 120" className="gauge" role="img" aria-label={`Market news sentiment: ${data.label}`}>
            <path d="M 20 100 A 80 80 0 0 1 60 30.7" className="arc arc-down" />
            <path d="M 60 30.7 A 80 80 0 0 1 140 30.7" className="arc arc-flat" />
            <path d="M 140 30.7 A 80 80 0 0 1 180 100" className="arc arc-up" />
            <g transform={`rotate(${angle} 100 100)`}>
              <line x1="100" y1="100" x2="100" y2="34" className="needle" />
            </g>
            <circle cx="100" cy="100" r="6" className="needle-hub" />
          </svg>
          <div className={`gauge-label chg ${cls}`}>{data.label}</div>
          <div className="gauge-score muted small">Net score {data.score > 0 ? '+' : ''}{data.score}</div>
          <div className="radar-bars">
            <span className="up">Bullish {data.bullish}</span>
            <span className="flat">Neutral {data.neutral}</span>
            <span className="down">Bearish {data.bearish}</span>
          </div>
        </>
      )}
    </section>
  );
}
