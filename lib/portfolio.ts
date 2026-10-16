// Pure portfolio maths. Prices are passed in, so this module has no network or database dependencies.
import { sectorFor } from './screen';

export interface Lot {
  id: number;
  symbol: string;
  shares: number;
  costPerShare: number;
  /** YYYY-MM-DD, or null when the purchase date was not entered. */
  acquiredOn: string | null;
}

export interface Quote {
  price: number;
  /** Day change per share in dollars. */
  change: number | null;
}

export interface Position {
  symbol: string;
  sector: string;
  shares: number;
  cost: number;
  avgCost: number;
  price: number | null;
  value: number | null;
  gain: number | null;
  gainPct: number | null;
  dayChange: number | null;
  lots: number;
}

export interface PortfolioTotals {
  /** Sums over priced positions only, so value, cost and gain always describe the same set. */
  value: number;
  cost: number;
  gain: number;
  gainPct: number | null;
  dayChange: number;
  pricedCount: number;
  unpriced: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Groups lots by symbol and values each position at the supplied price. */
export function buildPositions(lots: Lot[], quotes: Map<string, Quote>): { positions: Position[]; totals: PortfolioTotals } {
  const bySymbol = new Map<string, { shares: number; cost: number; lots: number }>();
  for (const l of lots) {
    const cur = bySymbol.get(l.symbol) ?? { shares: 0, cost: 0, lots: 0 };
    cur.shares += l.shares;
    cur.cost += l.shares * l.costPerShare;
    cur.lots += 1;
    bySymbol.set(l.symbol, cur);
  }

  const positions: Position[] = Array.from(bySymbol.entries())
    .map(([symbol, p]) => {
      const q = quotes.get(symbol) ?? null;
      const value = q ? p.shares * q.price : null;
      const gain = value === null ? null : value - p.cost;
      return {
        symbol,
        sector: sectorFor(symbol),
        shares: p.shares,
        cost: p.cost,
        avgCost: p.shares ? p.cost / p.shares : 0,
        price: q ? q.price : null,
        value,
        gain,
        gainPct: gain === null || p.cost === 0 ? null : (gain / p.cost) * 100,
        dayChange: q && q.change !== null ? p.shares * q.change : null,
        lots: p.lots,
      };
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1) || a.symbol.localeCompare(b.symbol));

  const priced = positions.filter((p) => p.value !== null);
  const value = priced.reduce((s, p) => s + (p.value ?? 0), 0);
  const cost = priced.reduce((s, p) => s + p.cost, 0);
  const totals: PortfolioTotals = {
    value: round2(value),
    cost: round2(cost),
    gain: round2(value - cost),
    gainPct: cost > 0 ? ((value - cost) / cost) * 100 : null,
    dayChange: round2(priced.reduce((s, p) => s + (p.dayChange ?? 0), 0)),
    pricedCount: priced.length,
    unpriced: positions.filter((p) => p.value === null).map((p) => p.symbol),
  };
  return { positions, totals };
}

export interface AllocationSlice {
  label: string;
  value: number;
  weight: number;
}

/** Share of priced value by sector or by position, largest first. */
export function allocationBy(positions: Position[], mode: 'sector' | 'position'): AllocationSlice[] {
  const groups = new Map<string, number>();
  for (const p of positions) {
    if (p.value === null) continue;
    const key = mode === 'sector' ? p.sector : p.symbol;
    groups.set(key, (groups.get(key) ?? 0) + p.value);
  }
  const total = Array.from(groups.values()).reduce((s, v) => s + v, 0);
  if (total <= 0) return [];
  return Array.from(groups.entries())
    .map(([label, value]) => ({ label, value: round2(value), weight: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value);
}
