'use client';

import { useState } from 'react';
import { api, useApi } from '@/lib/client';
import { fmtDateTime, fmtPct, trend } from '@/lib/format';
import type { Briefing, BriefingKind } from '@/lib/briefing';
import type { Article } from '@/lib/types';
import Icon from './Icon';
import { Cover } from './NewsCard';
import { Skeletons } from './NewsSection';
import { useReader } from './Providers';

const KINDS: { id: BriefingKind; label: string; title: string; outlookLabel: string }[] = [
  { id: 'daily', label: 'Daily', title: 'Morning Edition', outlookLabel: 'What to watch today' },
  { id: 'weekly', label: 'Weekly', title: 'Weekly Recap', outlookLabel: 'What to watch next week' },
];

const toArticle = (s: Briefing['stories'][number]): Article => ({
  id: s.id,
  headline: s.title,
  summary: s.summary,
  source: s.source,
  url: s.url,
  image: s.image,
  publishedAt: s.publishedAt,
  related: s.symbols,
  category: 'general',
});

export default function BriefingPanel() {
  const [kind, setKind] = useState<BriefingKind>('daily');
  const [fresh, setFresh] = useState<{ kind: BriefingKind; briefing: Briefing } | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { openArticle } = useReader();
  const { data: saved, error, loading, reload } = useApi<Briefing | null>(`/api/briefing?kind=${kind}`, 0);

  const edition = fresh?.kind === kind ? fresh.briefing : saved ?? null;
  const meta = KINDS.find((k) => k.id === kind)!;

  const regenerate = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const briefing = await api<Briefing>('/api/briefing', { method: 'POST', body: JSON.stringify({ kind }) });
      setFresh({ kind, briefing });
    } catch (e) {
      // Keep the last saved edition on screen and say why the new one did not load.
      setActionError(e instanceof Error ? e.message : 'Could not generate the edition');
    } finally {
      setBusy(false);
    }
  };

  const switchKind = (k: BriefingKind) => {
    setKind(k);
    setActionError(null);
  };

  return (
    <section className="card briefing" aria-labelledby="briefing-title">
      <div className="section-head">
        <div className="briefing-title">
          <h2 id="briefing-title">{meta.title}</h2>
          {edition && <span className="muted small">Dated {edition.editionDate}</span>}
        </div>
        <div className="row-gap">
          <div className="seg" role="group" aria-label="Edition">
            {KINDS.map((k) => (
              <button key={k.id} type="button" className={kind === k.id ? 'active' : ''} aria-pressed={kind === k.id} onClick={() => switchKind(k.id)}>
                {k.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost" onClick={regenerate} disabled={busy}>
            <Icon name="ai" size={16} /> {busy ? 'Writing...' : 'Regenerate'}
          </button>
        </div>
      </div>

      {actionError && (
        <p className="error small" role="alert">
          {actionError}
          {edition && ' Showing the last saved edition.'}
        </p>
      )}

      {loading && !saved && !fresh ? (
        <Skeletons n={1} />
      ) : error && !edition ? (
        <p className="error">Could not load the edition: {error}</p>
      ) : !edition ? (
        <div className="briefing-empty">
          <p className="muted">No {meta.label.toLowerCase()} edition yet. Press Regenerate to write one from your watchlist, or wait for the scheduled run.</p>
        </div>
      ) : (
        <>
          <p className="briefing-lead">{edition.lead}</p>
          <div className="briefing-stories">
            {edition.stories.map((s) => (
              <article key={s.id} className="briefing-story">
                {s.image && (
                  <div className="briefing-cover">
                    <Cover src={s.image} />
                  </div>
                )}
                <div className="briefing-story-body">
                  <div className="news-meta">
                    <span className="badge">{s.source}</span>
                  </div>
                  <button type="button" className="title-btn" onClick={() => openArticle(toArticle(s))}>
                    {s.title}
                  </button>
                  <p className="muted">{s.summary}</p>
                  {s.symbols.length > 0 && (
                    <div className="chips">
                      {s.symbols.slice(0, 4).map((sym) => (
                        <a key={sym} href={`/stock/${encodeURIComponent(sym)}`} className="chip">
                          {sym}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
          {edition.movers.length > 0 && (
            <div className="briefing-movers" aria-label="Biggest moves">
              <span className="muted small">{kind === 'daily' ? 'Biggest moves today' : 'Biggest 5-session moves'}</span>
              {edition.movers.map((m) => (
                <a key={m.symbol} href={`/stock/${encodeURIComponent(m.symbol)}`} className={`pill ${trend(m.changePct)}`}>
                  {m.symbol} {fmtPct(m.changePct)}
                </a>
              ))}
            </div>
          )}
          <h4>{meta.outlookLabel}</h4>
          <p>{edition.outlook}</p>
        </>
      )}

      {edition && (
        <p className="muted small briefing-foot">
          Generated {fmtDateTime(edition.generatedAt)} from your watchlist ({edition.watchlist.join(', ')}), live quotes and news. AI-generated, not financial advice.
        </p>
      )}
    </section>
  );
}
