'use client';

/** Search box and tag filter shared by the vault and notes lists. */
export default function LibraryTools({
  query,
  onQuery,
  tags,
  activeTag,
  onTag,
}: {
  query: string;
  onQuery: (q: string) => void;
  tags: string[];
  activeTag: string | null;
  onTag: (t: string | null) => void;
}) {
  return (
    <div className="library-tools">
      <input
        className="input"
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search saved articles, highlights and notes"
        aria-label="Search library"
        maxLength={200}
      />
      {tags.length > 0 && (
        <div className="chips" role="group" aria-label="Filter by tag">
          {tags.map((t) => (
            <button key={t} type="button" className={`chip ${activeTag === t ? 'active' : ''}`} aria-pressed={activeTag === t} onClick={() => onTag(activeTag === t ? null : t)}>
              #{t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
