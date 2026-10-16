import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { consensusLabel, consensusScore, mapInsiderRows, ratingChanges } from './insider';

const t = (period: string, sb: number, b: number, h: number, s: number, ss: number) => ({
  period,
  strongBuy: sb,
  buy: b,
  hold: h,
  sell: s,
  strongSell: ss,
});

describe('mapInsiderRows', () => {
  it('maps codes, sorts newest first and caps the list', () => {
    const rows = mapInsiderRows([
      { name: 'A', transactionDate: '2026-09-01', transactionCode: 'p', change: 100, transactionPrice: 10, filingDate: '2026-09-03' },
      { name: 'B', transactionDate: '2026-10-01', transactionCode: 'S', change: -50, transactionPrice: null, filingDate: '2026-10-02' },
      { name: 'C', transactionCode: 'S' },
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].name, 'B');
    assert.equal(rows[0].codeLabel, 'Open-market sale');
    assert.equal(rows[1].codeLabel, 'Open-market purchase');
    const raw = [1, 2, 3].map((n) => ({ name: `N${n}`, transactionDate: `2026-10-0${n}`, transactionCode: 'P' }));
    assert.equal(mapInsiderRows(raw, 2).length, 2);
  });
});

describe('consensus', () => {
  it('weights ratings on a 1 to 5 scale', () => {
    assert.equal(consensusScore(t('x', 1, 0, 0, 0, 0)), 5);
    assert.equal(consensusScore(t('x', 0, 0, 0, 0, 0)), null);
    assert.equal(consensusLabel(4), 'Buy');
    assert.equal(consensusLabel(2), 'Sell');
  });
});

describe('ratingChanges', () => {
  it('reports label moves and large score shifts, newest first, and skips noise', () => {
    const changes = ratingChanges([
      t('2026-07', 0, 5, 5, 0, 0), // score 3.5 Buy
      t('2026-08', 0, 5, 5, 0, 0), // unchanged
      t('2026-09', 0, 1, 9, 0, 0), // score 3.1 Hold: label change
    ]);
    assert.equal(changes.length, 1);
    assert.equal(changes[0].period, '2026-09');
    assert.equal(changes[0].from, 'Buy');
    assert.equal(changes[0].to, 'Hold');
    assert.equal(changes[0].direction, 'down');
  });
});
