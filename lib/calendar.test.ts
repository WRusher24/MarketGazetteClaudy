import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { addDays, reminderItems, type EarningsItem } from './calendar';

const item = (symbol: string, date: string): EarningsItem => ({
  symbol,
  date,
  hour: 'amc',
  epsEstimate: null,
  epsActual: null,
  revenueEstimate: null,
  quarter: null,
  year: null,
});

describe('addDays', () => {
  it('moves across month and year boundaries', () => {
    assert.equal(addDays('2026-10-31', 1), '2026-11-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });
});

describe('reminderItems', () => {
  it('returns only the items reporting tomorrow', () => {
    const items = [item('AAPL', '2026-10-17'), item('MSFT', '2026-10-16'), item('NVDA', '2026-10-18')];
    assert.deepEqual(
      reminderItems(items, '2026-10-16').map((i) => i.symbol),
      ['AAPL'],
    );
  });

  it('handles a month end', () => {
    assert.deepEqual(
      reminderItems([item('XOM', '2026-11-01')], '2026-10-31').map((i) => i.symbol),
      ['XOM'],
    );
  });
});
