import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rankMovers, type MarketQuote } from './market';

const q = (symbol: string, changePct: number): MarketQuote => ({ symbol, label: symbol, price: 1, change: 0, changePct });

describe('rankMovers', () => {
  it('returns gainers high to low and losers low to high, ignoring flat stocks', () => {
    const { gainers, losers } = rankMovers([q('A', 2), q('B', -1), q('C', 0), q('D', 5), q('E', -4)], 2);
    assert.deepEqual(
      gainers.map((x) => x.symbol),
      ['D', 'A'],
    );
    assert.deepEqual(
      losers.map((x) => x.symbol),
      ['E', 'B'],
    );
  });
});
