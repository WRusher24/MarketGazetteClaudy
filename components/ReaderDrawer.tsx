'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { fmtDateTime } from '@/lib/format';
import type { Article, ArticleSummary } from '@/lib/types';
import Icon from './Icon';
import { Cover } from './NewsCard';
import { useReader, useStore } from './Providers';
import StoryWorkbench from './StoryWorkbench';

interface Body {
  paragraphs: string[];
  image: string | null;
}

export function ImpactTag({ label }: { label: string }) {
  const cls = label === 'Bullish' ? 'up' : label === 'Bearish' ? 'down' : 'flat';
  return <span className={`pill ${cls}`}>{label}</span>;
}

function Reader({ article, onClose }: { article: Article; onClose: () => void }) {
  const { isBookmarked, saveBookmark, removeBookmark } = useStore();
  const [body, setBody] = useState<Body | null>(null);
  const [bodyLoading, setBodyLoading] = useState(true);
  const [ai, setAi] = useState<ArticleSummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selection, setSelection] = useState('');

  useEffect(() => {
    let alive = true;
    setSelection('');
    setBody(null);
    setBodyLoading(true);
    setAi(null);
    setAiError(null);
    api<Body>(`/api/article?url=${encodeURIComponent(article.url)}`)
      .then((b) => alive && setBody(b))
      .catch(() => alive && setBody({ paragraphs: [], image: null }))
      .finally(() => alive && setBodyLoading(false));
    return () => {
      alive = false;
    };
  }, [article.id, article.url]);

  const paragraphs = body?.paragraphs ?? [];
  const cover = article.image ?? body?.image ?? null;
  const saved = isBookmarked(article.id);

  const summarize = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await api<ArticleSummary>('/api/ai/summary', {
        method: 'POST',
        body: JSON.stringify({
          id: article.id,
          headline: article.headline,
          summary: article.summary,
          content: paragraphs.join('\n\n'),
          related: article.related,
          source: article.source,
        }),
      });
      setAi(result);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI summary failed');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleSave = async () => {
    setSaveError(null);
    try {
      if (saved) await removeBookmark(article.id);
      else
        await saveBookmark({
          kind: 'article',
          key: article.id,
          title: article.headline,
          source: article.source,
          url: article.url,
          image: article.image,
          summary: article.summary,
          body: '',
          symbol: article.related[0] ?? '',
        });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not update the vault');
    }
  };

  return (
    <>
      <div className="drawer-head">
        <span className="badge">{article.source}</span>
        <time dateTime={article.publishedAt} className="muted small">
          {fmtDateTime(article.publishedAt)}
        </time>
        <span className="spacer" />
        <button type="button" className="icon-btn" onClick={toggleSave} aria-pressed={saved} aria-label={saved ? 'Remove from vault' : 'Save to vault'} title={saved ? 'Saved' : 'Save to reading vault'}>
          <Icon name="bookmark" />
        </button>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close reader">
          <Icon name="close" />
        </button>
      </div>

      <div className="drawer-body">
        <h1>{article.headline}</h1>
        {article.related.length > 0 && (
          <div className="chips">
            {article.related.slice(0, 6).map((s) => (
              <Link key={s} href={`/stock/${encodeURIComponent(s)}`} className="chip" onClick={onClose}>
                {s}
              </Link>
            ))}
          </div>
        )}
        <Cover src={cover} className="drawer-cover" />

        <div className="ai-box">
          <div className="ai-box-head">
            <strong>AI Executive Summary</strong>
            <button type="button" className="btn" onClick={summarize} disabled={aiLoading || bodyLoading}>
              <Icon name="ai" size={16} /> {aiLoading ? 'Analyzing...' : ai ? 'Regenerate' : 'Summarize with AI'}
            </button>
          </div>
          {aiError && <p className="error">{aiError}</p>}
          {ai && (
            <div className="ai-result">
              <h4>3 Key Takeaways</h4>
              <ol>
                {ai.takeaways.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
              <h4>
                Impact on Stock Price <ImpactTag label={ai.priceImpact.direction} />
              </h4>
              <p>{ai.priceImpact.explanation}</p>
              <h4>
                Market Sentiment <ImpactTag label={ai.sentiment.label} />
                <span className="muted small"> score {ai.sentiment.score > 0 ? '+' : ''}{ai.sentiment.score}</span>
              </h4>
              <p>{ai.sentiment.rationale}</p>
            </div>
          )}
        </div>

        <div className="article-text" onMouseUp={() => setSelection(window.getSelection()?.toString().trim().slice(0, 2000) ?? '')} onKeyUp={() => setSelection(window.getSelection()?.toString().trim().slice(0, 2000) ?? '')}>
          {bodyLoading ? (
            <div className="skeleton" style={{ height: 160 }} />
          ) : paragraphs.length > 0 ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <>
              {article.summary ? <p>{article.summary}</p> : <p className="muted">No preview text is available for this story.</p>}
              <p className="muted small">The publisher does not allow full-text extraction for this story. Use the link below to read the original.</p>
            </>
          )}
        </div>
        {saveError && <p className="error">{saveError}</p>}

        <StoryWorkbench article={article} selection={selection} onSaved={() => setSelection('')} />

        <a className="btn btn-ghost" href={article.url} target="_blank" rel="noopener noreferrer">
          <Icon name="link" size={16} /> Open original article
        </a>
      </div>
    </>
  );
}

export default function ReaderDrawer() {
  const { article, closeArticle } = useReader();

  useEffect(() => {
    if (!article) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeArticle();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [article, closeArticle]);

  if (!article) return null;
  return (
    <div className="overlay" onClick={closeArticle}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="Article reader" onClick={(e) => e.stopPropagation()}>
        <Reader article={article} onClose={closeArticle} />
      </aside>
    </div>
  );
}
