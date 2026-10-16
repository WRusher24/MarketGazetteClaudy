import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseAskAnswer, type AskSource } from './ask';

const sources: AskSource[] = [
  { id: 'F1', kind: 'figure', label: 'Price $10' },
  { id: 'H1', kind: 'headline', label: 'Headline one', url: 'https://example.com/1' },
];

describe('parseAskAnswer', () => {
  it('resolves citations from both the cite list and inline markers, dropping unknown ids', () => {
    const out = parseAskAnswer({ answer: 'The price is $10 [F1] after news [H1] and [H9].', cite: ['F1', 'F7'] }, sources);
    assert.deepEqual(
      out.citations.map((c) => c.id),
      ['F1', 'H1'],
    );
    assert.match(out.answer, /\[H9\]/);
  });

  it('refuses an empty answer so nothing blank is shown', () => {
    assert.throws(() => parseAskAnswer({ answer: '   ', cite: [] }, sources), /empty answer/);
  });
});
