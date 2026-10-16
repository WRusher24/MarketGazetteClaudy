import { ensureSchema } from '../lib/db';

async function main() {
  await ensureSchema();
  console.log('Migration complete: watchlist, bookmarks, notes, news_cache, ai_cache are ready.');
}

main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
