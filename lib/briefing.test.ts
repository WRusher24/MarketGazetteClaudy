import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  REGENERATE_COOLDOWN_MS,
  cooldownRemainingMs,
  editionDateFor,
  parseEdition,
  pickMovers,
  weeklyMovePct,
} from './briefing';
import type { Article } from './types';

const article = (id: string, headline: string): Article => ({
  id,
  headline,
  summary: '',
  source: 'Test',
  url: `https://example.com/${id}`,
  image: null,
  publishedAt: '2026-10-16T10:00:00.000Z',
  related: ['AAPL'],
  category: 'general',
});

describe('editionDateFor', () => {
  it('dates daily editions by UTC day', () => {
    assert.equal(editionDateFor('daily', new Date('2026-10-16T23:30:00Z')), '2026-10-16');
  });

  it('dates weekly editions by the Sunday that starts the week', () => {
    // 2026-10-16 is a Friday, so the week started Sunday 2026-10-11.
    assert.equal(editionDateFor('weekly', new Date('2026-10-16T12:00:00Z')), '2026-10-11');
    assert.equal(editionDateFor('weekly', new Date('2026-10-11T23:00:00Z')), '2026-10-11');
  });
});

describe('weeklyMovePct', () => {
  it('measures first open to latest close', () => {
    assert.equal(
      weeklyMovePct([
        { open: 100, close: 90 },
        { open: 90, close: 110 },
      ]),
      10,
    );
  });

  it('returns null without enough sessions or a usable base', () => {
    assert.equal(weeklyMovePct([{ open: 100, close: 101 }]), null);
    assert.equal(
      weeklyMovePct([
        { open: 0, close: 1 },
        { open: 1, close: 2 },
      ]),
      null,
    );
  });
});

describe('pickMovers', () => {
  it('keeps the largest absolute moves, biggest first', () => {
    const picked = pickMovers(
      [
        { symbol: 'A', changePct: 1, basis: 'day' },
        { symbol: 'B', changePct: -5, basis: 'day' },
        { symbol: 'C', changePct: 3, basis: 'day' },
      ],
      2,
    );
    assert.deepEqual(
      picked.map((m) => m.symbol),
      ['B', 'C'],
    );
  });
});

describe('cooldownRemainingMs', () => {
  const now = new Date('2026-10-16T12:00:00Z');

  it('blocks a regenerate inside the cooldown and allows it after', () => {
    assert.equal(cooldownRemainingMs(new Date(now.getTime() - 10_000), now), REGENERATE_COOLDOWN_MS - 10_000);
    assert.equal(cooldownRemainingMs(new Date(now.getTime() - REGENERATE_COOLDOWN_MS), now), 0);
  });

  it('allows a regenerate when nothing was generated yet', () => {
    assert.equal(cooldownRemainingMs(null, now), 0);
  });
});

describe('parseEdition', () => {
  const articles = [article('a1', 'First'), article('a2', 'Second'), article('a3', 'Third')];

  it('maps story numbers to real articles and drops invalid or repeated ones', () => {
    const edition = parseEdition(
      {
        lead: 'Lead text',
        outlook: 'Watch CPI.',
        stories: [
          { n: 1, why: 'Matters a lot' },
          { n: 1, why: 'Duplicate' },
          { n: 9, why: 'Out of range' },
          { n: 3, why: 'Also matters' },
        ],
      },
      articles,
      5,
    );
    assert.deepEqual(
      edition.stories.map((s) => [s.id, s.url, s.title]),
      [
        ['a1', 'https://example.com/a1', 'First'],
        ['a3', 'https://example.com/a3', 'Third'],
      ],
    );
  });

  it('respects the story limit', () => {
    const edition = parseEdition(
      { lead: 'L', outlook: 'O', stories: [{ n: 1, why: '' }, { n: 2, why: '' }, { n: 3, why: '' }] },
      articles,
      2,
    );
    assert.equal(edition.stories.length, 2);
  });

  it('refuses incomplete or empty answers so they are not saved', () => {
    assert.throws(() => parseEdition({ lead: '', outlook: 'O', stories: [{ n: 1 }] }, articles, 5), /incomplete/);
    assert.throws(() => parseEdition({ lead: 'L', outlook: 'O', stories: [{ n: 42 }] }, articles, 5), /valid headlines/);
  });
});
