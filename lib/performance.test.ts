import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPerformance } from './performance';
import type { Lot } from './portfolio';

const lot = (over: Partial<Lot>): Lot => ({ id: 1, symbol: 'AAPL', shares: 10, costPerShare: 100, acquiredOn: '2026-01-02', ...over });

describe('buildPerformance', () => {
  const spx = [
    { date: '2026-01-02', close: 1000 },
    { date: '2026-01-05', close: 1100 },
  ];
  const history = new Map([
    [
      'AAPL',
      [
        { date: '2026-01-02', close: 100 },
        { date: '2026-01-05', close: 110 },
      ],
    ],
  ]);

  it('values the portfolio and the S&P 500 comparison on the same cash', () => {
    const { points, excludedLots } = buildPerformance([lot({})], history, spx);
    assert.equal(excludedLots, 0);
    const last = points[points.length - 1];
    assert.equal(last.invested, 1000);
    assert.equal(last.portfolio, 1100);
    assert.equal(last.benchmark, 1100);
  });

  it('leaves out lots without a purchase date and reports them', () => {
    const { points, excludedLots } = buildPerformance([lot({ acquiredOn: null })], history, spx);
    assert.equal(points.length, 0);
    assert.equal(excludedLots, 1);
  });

  it('holds a lot at cost when its symbol has no history', () => {
    const { points, missingHistory } = buildPerformance([lot({ symbol: 'ZZZZ' })], history, spx);
    assert.deepEqual(missingHistory, ['ZZZZ']);
    assert.equal(points[points.length - 1].portfolio, 1000);
  });
});
