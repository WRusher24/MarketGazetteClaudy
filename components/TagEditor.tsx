'use client';

import { useEffect, useState } from 'react';
import { parseTags } from '@/lib/library';

/** Edits the tags on one item. Saves on Enter or when the field loses focus, if the tags changed. */
export default function TagEditor({ tags, onSave, label }: { tags: string[]; onSave: (tags: string[]) => Promise<void>; label: string }) {
  const [text, setText] = useState(tags.join(', '));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(tags.join(', '));
  }, [tags]);

  const commit = async () => {
    let next: string[];
    try {
      next = parseTags(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid tags');
      return;
    }
    if (next.join(',') === tags.join(',')) return;
    setError(null);
    try {
      await onSave(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save tags');
    }
  };

  return (
    <div className="tag-editor">
      <input
        className="input small"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
        placeholder="Tags, e.g. thesis, earnings"
        aria-label={`Tags for ${label}`}
        maxLength={300}
      />
      {error && <span className="error small">{error}</span>}
    </div>
  );
}
