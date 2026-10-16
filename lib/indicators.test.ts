import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rsi, sma } from './indicators';

describe('sma', () => {
  it('averages the last `period` values and leaves warm-up empty', () => {
    assert.deepEqual(sma([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
  });

  it('returns all nulls when there is not enough data', () => {
    assert.deepEqual(sma([1, 2], 5), [null, null]);
  });
});

describe('rsi', () => {
  it('is 100 for a series that only rises', () => {
    const out = rsi([1, 2, 3, 4, 5, 6], 3);
    assert.equal(out[3], 100);
    assert.equal(out[5], 100);
    assert.equal(out[2], null);
  });

  it('is 0 for a series that only falls', () => {
    const out = rsi([6, 5, 4, 3, 2, 1], 3);
    assert.equal(out[3], 0);
  });

  it('stays between 0 and 100 on mixed moves', () => {
    const closes = [44, 44.3, 44.1, 43.6, 44.3, 44.8, 45.1, 45.4, 45.8, 46.1, 45.9, 46.3, 46.6, 46.2, 46.8];
    const out = rsi(closes, 14).filter((v): v is number => v !== null);
    assert.ok(out.length > 0);
    for (const v of out) assert.ok(v >= 0 && v <= 100, `out of range: ${v}`);
  });
});
