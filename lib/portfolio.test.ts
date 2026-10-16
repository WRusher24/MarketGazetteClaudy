import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { allocationBy, buildPositions, type Lot } from './portfolio';

const lot = (id: number, symbol: string, shares: number, costPerShare: number): Lot => ({ id, symbol, shares, costPerShare, acquiredOn: null });

describe('buildPositions', () => {
  it('aggregates lots per symbol and computes gain and day change', () => {
    const lots = [lot(1, 'AAPL', 10, 100), lot(2, 'AAPL', 10, 120), lot(3, 'XOM', 5, 50)];
    const quotes = new Map([
      ['AAPL', { price: 150, change: 2 }],
      ['XOM', { price: 40, change: -1 }],
    ]);
    const { positions, totals } = buildPositions(lots, quotes);
    const aapl = positions.find((p) => p.symbol === 'AAPL')!;
    assert.equal(aapl.shares, 20);
    assert.equal(aapl.cost, 2200);
    assert.equal(aapl.avgCost, 110);
    assert.equal(aapl.value, 3000);
    assert.equal(aapl.gain, 800);
    assert.equal(aapl.dayChange, 40);
    assert.equal(aapl.lots, 2);
    assert.equal(totals.value, 3200);
    assert.equal(totals.cost, 2450);
    assert.equal(totals.gain, 750);
    assert.equal(totals.dayChange, 35);
    assert.equal(totals.pricedCount, 2);
    assert.deepEqual(totals.unpriced, []);
  });

  it('keeps unpriced positions out of totals and lists them', () => {
    const { positions, totals } = buildPositions([lot(1, 'AAPL', 10, 100), lot(2, 'ZZZZ', 3, 10)], new Map([['AAPL', { price: 110, change: null }]]));
    const zz = positions.find((p) => p.symbol === 'ZZZZ')!;
    assert.equal(zz.value, null);
    assert.equal(zz.gain, null);
    assert.equal(totals.value, 1100);
    assert.equal(totals.cost, 1000);
    assert.deepEqual(totals.unpriced, ['ZZZZ']);
    assert.equal(totals.dayChange, 0);
  });
});

describe('allocationBy', () => {
  it('weights priced positions by sector and by position', () => {
    const { positions } = buildPositions(
      [lot(1, 'AAPL', 10, 0), lot(2, 'XOM', 10, 0), lot(3, 'ZZZZ', 1, 0)],
      new Map([
        ['AAPL', { price: 30, change: 0 }],
        ['XOM', { price: 10, change: 0 }],
      ]),
    );
    const bySector = allocationBy(positions, 'sector');
    assert.deepEqual(
      bySector.map((s) => [s.label, s.weight]),
      [
        ['Technology', 75],
        ['Energy', 25],
      ],
    );
    assert.equal(allocationBy(positions, 'position')[0].label, 'AAPL');
  });
});
