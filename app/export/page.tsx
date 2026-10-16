'use client';

import { useMemo } from 'react';
import Icon from '@/components/Icon';
import { useStore } from '@/components/Providers';
import { useApi } from '@/lib/client';
import { fmtDateTime } from '@/lib/format';
import { toMarkdown } from '@/lib/library';
import type { Highlight, Note } from '@/lib/types';

/** Exports saved articles, highlights and notes as Markdown, or prints them to PDF from the browser. */
export default function ExportPage() {
  const { bookmarks } = useStore();
  const notes = useApi<Note[]>('/api/notes');
  const highlights = useApi<Highlight[]>('/api/highlights', 0);
  const ready = notes.data !== null && highlights.data !== null;
  const generatedAt = useMemo(() => new Date().toISOString(), []);
  const markdown = useMemo(
    () => (ready ? toMarkdown({ bookmarks, notes: notes.data ?? [], highlights: highlights.data ?? [], generatedAt }) : ''),
    [ready, bookmarks, notes.data, highlights.data, generatedAt],
  );
  const failure = notes.error ?? highlights.error;

  const download = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketgazette-export-${generatedAt.slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="no-print">
        <h1 className="page-title">Export</h1>
        <p className="muted small">
          Includes {bookmarks.length} saved items, {notes.data?.length ?? '…'} notes and {highlights.data?.length ?? '…'} highlights.
          Generated {fmtDateTime(generatedAt)}.
        </p>
        <div className="row-gap">
          <button type="button" className="btn" onClick={download} disabled={!ready}>
            <Icon name="link" size={16} /> Download Markdown
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => window.print()} disabled={!ready}>
            Print or save as PDF
          </button>
        </div>
        {failure && <p className="error small" role="alert">Some data could not be loaded: {failure}</p>}
      </div>
      {!ready && !failure && <div className="skeleton" style={{ height: 120 }} />}
      {ready && <pre className="export-doc">{markdown}</pre>}
    </div>
  );
}
