import { query } from './db';
import { HttpError } from './http';

export interface WatchList {
  id: number;
  name: string;
  symbols: string[];
}

export const LIST_NAME_MAX = 40;

/** Trims and checks a list name. Returns null when it is empty, too long or has control characters. */
export function cleanListName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().replace(/\s+/g, ' ');
  if (!name || name.length > LIST_NAME_MAX || /[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}

/** Every distinct symbol across all lists, in the order first added. Used by news, briefings and screener. */
export async function getWatchlistSymbols(): Promise<string[]> {
  const rows = await query<{ symbol: string }>(
    'SELECT symbol FROM watchlist_members GROUP BY symbol ORDER BY MIN(added_at)',
  );
  return rows.map((r) => r.symbol);
}

export async function getLists(): Promise<WatchList[]> {
  const rows = await query<{ id: string; name: string; symbols: string[] }>(
    `SELECT l.id, l.name, COALESCE(array_agg(m.symbol ORDER BY m.added_at) FILTER (WHERE m.symbol IS NOT NULL), '{}') AS symbols
     FROM watchlists l LEFT JOIN watchlist_members m ON m.list_id = l.id
     GROUP BY l.id, l.name ORDER BY l.id`,
  );
  return rows.map((r) => ({ id: Number(r.id), name: r.name, symbols: r.symbols ?? [] }));
}

/** Lowest-id list, which receives symbols when no list is named. */
async function defaultListId(): Promise<number> {
  const rows = await query<{ id: string }>('SELECT id FROM watchlists ORDER BY id LIMIT 1');
  if (!rows[0]) throw new HttpError('No watchlist exists yet', 404);
  return Number(rows[0].id);
}

export async function resolveListId(listId?: number | null): Promise<number> {
  if (listId == null) return defaultListId();
  const rows = await query<{ id: string }>('SELECT id FROM watchlists WHERE id = $1', [listId]);
  if (!rows[0]) throw new HttpError('Watchlist not found', 404);
  return listId;
}

export async function createList(name: string): Promise<WatchList> {
  const existing = await query<{ id: string }>('SELECT id FROM watchlists WHERE lower(name) = lower($1)', [name]);
  if (existing[0]) throw new HttpError('A watchlist with that name already exists', 409);
  const rows = await query<{ id: string; name: string }>(
    'INSERT INTO watchlists (name) VALUES ($1) RETURNING id, name',
    [name],
  );
  return { id: Number(rows[0].id), name: rows[0].name, symbols: [] };
}

export async function renameList(id: number, name: string): Promise<void> {
  await resolveListId(id);
  const clash = await query<{ id: string }>('SELECT id FROM watchlists WHERE lower(name) = lower($1) AND id <> $2', [name, id]);
  if (clash[0]) throw new HttpError('A watchlist with that name already exists', 409);
  await query('UPDATE watchlists SET name = $2 WHERE id = $1', [id, name]);
}

/** Deletes a list and its memberships. The last remaining list is kept so the app always has one. */
export async function deleteList(id: number): Promise<void> {
  await resolveListId(id);
  const count = await query<{ n: string }>('SELECT count(*) AS n FROM watchlists');
  if (Number(count[0].n) <= 1) throw new HttpError('Keep at least one watchlist', 400);
  await query('DELETE FROM watchlists WHERE id = $1', [id]);
}

export async function addMember(symbol: string, listId?: number | null): Promise<number> {
  const id = await resolveListId(listId ?? null);
  await query(
    'INSERT INTO watchlist_members (list_id, symbol) VALUES ($1, $2) ON CONFLICT (list_id, symbol) DO NOTHING',
    [id, symbol],
  );
  return id;
}

/** Removes a symbol from one list, or from every list when no list is given. */
export async function removeMember(symbol: string, listId?: number | null): Promise<void> {
  if (listId == null) {
    await query('DELETE FROM watchlist_members WHERE symbol = $1', [symbol]);
    return;
  }
  await query('DELETE FROM watchlist_members WHERE symbol = $1 AND list_id = $2', [symbol, listId]);
}
