import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filterRows, periodReturnPct, screenerSymbols, sectorFor, type ScreenerRow } from './screen';

const row = (symbol: string, o: Partial<ScreenerRow> = {}): ScreenerRow => ({
  symbol,
  sector: 'Technology',
  price: 10,
  marketCap: 50e9,
  pe: 20,
  momentum3m: 5,
  source: 'universe',
  ...o,
});

describe('periodReturnPct', () => {
  it('measures first to last close and needs two usable closes', () => {
    assert.equal(periodReturnPct([100, 110, 121]), 21);
    assert.equal(periodReturnPct([100]), null);
    assert.equal(periodReturnPct([0, 5]), null);
  });
});

describe('screenerSymbols', () => {
  it('puts watchlist symbols first, de-duplicates and caps the list', () => {
    const { symbols, skipped } = screenerSymbols(['AAPL', 'ZZZZ'], 5);
    assert.deepEqual(
      symbols.map((s) => s.symbol),
      ['AAPL', 'ZZZZ', 'MSFT', 'NVDA', 'AVGO'],
    );
    assert.equal(symbols[0].source, 'watchlist');
    assert.equal(symbols[2].source, 'universe');
    assert.ok(skipped.length > 0);
    assert.ok(!skipped.includes('AAPL'));
  });
});

describe('sectorFor', () => {
  it('uses the universe sector, or Unclassified for other symbols', () => {
    assert.equal(sectorFor('XOM'), 'Energy');
    assert.equal(sectorFor('ZZZZ'), 'Unclassified');
  });
});

describe('filterRows', () => {
  const rows = [
    row('A', { sector: 'Energy', marketCap: 5e9, pe: 12, momentum3m: 30 }),
    row('B', { sector: 'Technology', marketCap: 300e9, pe: 45, momentum3m: -4 }),
    row('C', { pe: null, momentum3m: null }),
  ];

  it('filters by sector and market cap', () => {
    assert.deepEqual(
      filterRows(rows, { sector: 'Technology', minMarketCap: 100e9 }).map((r) => r.symbol),
      ['B'],
    );
  });

  it('excludes unknown values when a numeric filter is set', () => {
    assert.deepEqual(
      filterRows(rows, { maxPe: 50 }).map((r) => r.symbol),
      ['A', 'B'],
    );
    assert.deepEqual(
      filterRows(rows, { minMomentum: 0 }).map((r) => r.symbol),
      ['A'],
    );
  });

  it('excludes negative earnings from a P/E cap', () => {
    assert.deepEqual(filterRows([row('N', { pe: -8 })], { maxPe: 50 }), []);
  });
});
