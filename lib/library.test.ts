import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { allTags, matchesQuery, parseTags, toMarkdown } from './library';
import type { Bookmark, Highlight, Note } from './types';

describe('parseTags', () => {
  it('normalises, de-duplicates and accepts comma strings', () => {
    assert.deepEqual(parseTags(' Thesis, ai ,THESIS,, '), ['thesis', 'ai']);
    assert.deepEqual(parseTags(['earnings', 'Q3']), ['earnings', 'q3']);
    assert.deepEqual(parseTags(undefined), []);
  });

  it('refuses bad tags and too many tags', () => {
    assert.throws(() => parseTags('bad tag!'), /must use letters/);
    assert.throws(() => parseTags(Array.from({ length: 11 }, (_, i) => `t${i}`)), /at most 10/);
    assert.throws(() => parseTags(42), /must be a list/);
  });
});

describe('matchesQuery', () => {
  const item = { text: 'Nvidia beats earnings estimates', tags: ['ai'] };
  it('requires every word and the tag when given', () => {
    assert.equal(matchesQuery(item, 'nvidia EARNINGS', null), true);
    assert.equal(matchesQuery(item, 'nvidia tesla', null), false);
    assert.equal(matchesQuery(item, '', 'ai'), true);
    assert.equal(matchesQuery(item, '', 'macro'), false);
  });
});

describe('allTags', () => {
  it('lists distinct tags sorted', () => {
    assert.deepEqual(allTags([{ tags: ['b', 'a'] }, { tags: ['a'] }]), ['a', 'b']);
  });
});

describe('toMarkdown', () => {
  it('writes articles with highlights, notes and standalone highlights', () => {
    const bookmark: Bookmark = {
      id: 1,
      kind: 'article',
      key: 'a1',
      title: 'Chip demand rises',
      source: 'Reuters',
      url: 'https://example.com/a1',
      image: null,
      summary: 'Demand is up.',
      body: '',
      symbol: 'NVDA',
      savedAt: '2026-10-01T10:00:00.000Z',
      tags: ['ai'],
    };
    const note: Note = {
      id: 2,
      symbol: 'NVDA',
      body: 'Thesis: data-centre growth continues.',
      createdAt: '2026-10-02T09:00:00.000Z',
      updatedAt: '2026-10-02T09:00:00.000Z',
      tags: ['thesis'],
      articleId: 'a1',
      articleTitle: 'Chip demand rises',
      articleUrl: 'https://example.com/a1',
    };
    const highlights: Highlight[] = [
      { id: 3, articleId: 'a1', articleTitle: 'Chip demand rises', articleUrl: '', symbol: '', body: 'Orders\nrose sharply.', createdAt: '2026-10-01T11:00:00.000Z' },
      { id: 4, articleId: 'zz', articleTitle: 'Other story', articleUrl: '', symbol: '', body: 'Loose quote', createdAt: '2026-10-03T11:00:00.000Z' },
    ];
    const md = toMarkdown({ bookmarks: [bookmark], notes: [note], highlights, generatedAt: '2026-10-04T00:00:00.000Z' });
    assert.match(md, /### Chip demand rises/);
    assert.match(md, /> Orders rose sharply\./);
    assert.match(md, /Tags: #thesis/);
    assert.match(md, /Linked article: Chip demand rises/);
    assert.match(md, /## Other highlights[\s\S]*Loose quote/);
    assert.doesNotMatch(md, /\n{3,}/);
  });
});
