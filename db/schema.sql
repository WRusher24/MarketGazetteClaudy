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

CREATE TABLE IF NOT EXISTS briefings (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('daily', 'weekly')),
  edition_date DATE NOT NULL,
  payload JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind, edition_date)
);

CREATE TABLE IF NOT EXISTS watchlists (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_members (
  list_id BIGINT NOT NULL REFERENCES watchlists (id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, symbol)
);

-- One-time migration from the legacy watchlist table into a "Default" list (guarded by schema_migrations).
CREATE TABLE IF NOT EXISTS schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO watchlists (name)
  SELECT 'Default' WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE name = 'watchlists_v1')
  ON CONFLICT (name) DO NOTHING;
INSERT INTO watchlist_members (list_id, symbol, added_at)
  SELECT l.id, w.symbol, w.added_at FROM watchlist w CROSS JOIN watchlists l
  WHERE l.name = 'Default' AND NOT EXISTS (SELECT 1 FROM schema_migrations WHERE name = 'watchlists_v1')
  ON CONFLICT (list_id, symbol) DO NOTHING;
INSERT INTO schema_migrations (name) VALUES ('watchlists_v1') ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS market_snapshots (
  name TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holdings (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  shares DOUBLE PRECISION NOT NULL CHECK (shares > 0),
  cost_per_share DOUBLE PRECISION NOT NULL CHECK (cost_per_share >= 0),
  acquired_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS holdings_symbol_idx ON holdings (symbol);
