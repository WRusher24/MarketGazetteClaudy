-- MarketGazette schema (Neon PostgreSQL). Applied by `npm run db:migrate`
-- and lazily on first request via lib/db.ts (CREATE ... IF NOT EXISTS, safe to re-run).

CREATE TABLE IF NOT EXISTS watchlist (
  symbol TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('article', 'report')),
  ref_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  image TEXT,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  symbol TEXT NOT NULL DEFAULT '',
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notes_symbol_idx ON notes (symbol);

CREATE TABLE IF NOT EXISTS news_cache (
  id TEXT PRIMARY KEY,
  headline TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  image TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  related TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_cache_published_idx ON news_cache (published_at DESC);

CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
