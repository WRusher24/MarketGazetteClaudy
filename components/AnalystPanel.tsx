'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDateTime } from '@/lib/format';
import type { AnalystReport } from '@/lib/types';
import Icon from './Icon';
import { useStore } from './Providers';
import { ImpactTag } from './ReaderDrawer';

function Items({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

export default function AnalystPanel({ symbol }: { symbol: string }) {
  const { isBookmarked, saveBookmark, removeBookmark } = useStore();
  const [report, setReport] = useState<AnalystReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = `report:${symbol}`;

  useEffect(() => {
    setReport(null);
    setError(null);
  }, [symbol]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await api<AnalystReport>('/api/ai/analyze', { method: 'POST', body: JSON.stringify({ symbol }) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleSave = async () => {
    if (!report) return;
    try {
      if (isBookmarked(key)) await removeBookmark(key);
      else
        await saveBookmark({
          kind: 'report',
          key,
          title: `${symbol} AI research report`,
          source: 'AI Analyst',
          url: '',
          image: null,
          summary: report.businessModel.summary,
          body: JSON.stringify(report),
          symbol,
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the vault');
    }
  };

  return (
    <section className="card">
      <div className="section-head">
        <h2>AI Analyst: {symbol}</h2>
        <div className="row-gap">
          {report && (
            <button type="button" className="btn btn-ghost" onClick={toggleSave} aria-pressed={isBookmarked(key)}>
              <Icon name="bookmark" size={16} /> {isBookmarked(key) ? 'Saved' : 'Save report'}
            </button>
          )}
          <button type="button" className="btn" onClick={run} disabled={loading}>
            <Icon name="ai" size={16} /> {loading ? 'Analyzing...' : report ? 'Regenerate' : 'Analyze Stock with AI'}
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {loading && <div className="skeleton" style={{ height: 180 }} />}
      {!report && !loading && !error && (
        <p className="muted">Generate an executive brief: business model, strengths vs. risks, latest earnings and market sentiment.</p>
      )}
      {report && !loading && <ReportBody report={report} />}
    </section>
  );
}

export function ReportBody({ report }: { report: AnalystReport }) {
  return (
    <div className="report">
      <div className="report-grid">
        <div>
          <h4>1. Business Model &amp; Revenue Drivers</h4>
          <p>{report.businessModel.summary}</p>
          <Items items={report.businessModel.drivers} />
        </div>
        <div>
          <h4>2. Core Strengths vs. Key Risks</h4>
          <h5 className="up">Strengths</h5>
          <Items items={report.strengthsRisks.strengths} />
          <h5 className="down">Risks</h5>
          <Items items={report.strengthsRisks.risks} />
        </div>
        <div>
          <h4>3. Recent Quarterly Earnings</h4>
          <p>{report.earnings.summary}</p>
          <Items items={report.earnings.highlights} />
        </div>
        <div>
          <h4>
            4. Market Sentiment &amp; Consensus <ImpactTag label={report.sentiment.label} />
          </h4>
          <p>
            <strong>{report.sentiment.consensus}</strong>
          </p>
          <p>{report.sentiment.summary}</p>
        </div>
      </div>
      <p className="muted small">
        Generated {fmtDateTime(report.generatedAt)} by Gemini from live Finnhub and news data. Informational only, not investment advice.
      </p>
    </div>
  );
}
