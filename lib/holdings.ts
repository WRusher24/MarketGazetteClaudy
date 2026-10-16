import { query } from './db';
import { HttpError } from './http';
import type { Lot } from './portfolio';

export const MAX_LOTS = 300;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a holding from user input. Throws HttpError with a clear message when something is wrong. */
export function parseLotInput(raw: { symbol?: unknown; shares?: unknown; costPerShare?: unknown; acquiredOn?: unknown }): Omit<Lot, 'id'> {
  const symbol = typeof raw.symbol === 'string' ? raw.symbol.trim().toUpperCase() : '';
  if (!/^[A-Z0-9][A-Z0-9.\-^=]{0,14}$/.test(symbol)) throw new HttpError('Enter a valid ticker symbol', 400);

  const shares = typeof raw.shares === 'number' ? raw.shares : Number(raw.shares);
  if (!Number.isFinite(shares) || shares <= 0 || shares > 1e9) throw new HttpError('Shares must be a number above 0', 400);

  const costPerShare = typeof raw.costPerShare === 'number' ? raw.costPerShare : Number(raw.costPerShare);
  if (!Number.isFinite(costPerShare) || costPerShare < 0 || costPerShare > 1e7) {
    throw new HttpError('Cost per share must be a number of 0 or more', 400);
  }

  let acquiredOn: string | null = null;
  if (raw.acquiredOn !== undefined && raw.acquiredOn !== null && raw.acquiredOn !== '') {
    const d = typeof raw.acquiredOn === 'string' ? raw.acquiredOn : '';
    const valid = DATE_RE.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
    if (!valid) throw new HttpError('Purchase date must be YYYY-MM-DD', 400);
    if (d > new Date().toISOString().slice(0, 10)) throw new HttpError('Purchase date cannot be in the future', 400);
    acquiredOn = d;
  }
  return { symbol, shares, costPerShare, acquiredOn };
}

export async function listLots(): Promise<Lot[]> {
  const rows = await query<{ id: string; symbol: string; shares: number; cost_per_share: number; acquired_on: string | null }>(
    `SELECT id, symbol, shares, cost_per_share, to_char(acquired_on, 'YYYY-MM-DD') AS acquired_on
     FROM holdings ORDER BY symbol, acquired_on NULLS LAST, id`,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    symbol: r.symbol,
    shares: Number(r.shares),
    costPerShare: Number(r.cost_per_share),
    acquiredOn: r.acquired_on,
  }));
}

export async function addLot(input: Omit<Lot, 'id'>): Promise<Lot> {
  const count = await query<{ n: string }>('SELECT count(*) AS n FROM holdings');
  if (Number(count[0].n) >= MAX_LOTS) throw new HttpError(`The portfolio is limited to ${MAX_LOTS} lots`, 400);
  const rows = await query<{ id: string }>(
    'INSERT INTO holdings (symbol, shares, cost_per_share, acquired_on) VALUES ($1, $2, $3, $4::date) RETURNING id',
    [input.symbol, input.shares, input.costPerShare, input.acquiredOn],
  );
  return { id: Number(rows[0].id), ...input };
}

export async function deleteLot(id: number): Promise<boolean> {
  const rows = await query<{ id: string }>('DELETE FROM holdings WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}
