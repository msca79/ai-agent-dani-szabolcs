import { describe, expect, it } from 'vitest';
import { parseAskRequestBody } from './ask-request';

describe('parseAskRequestBody', () => {
  it('should return the question and an empty history when history is omitted', () => {
    expect(parseAskRequestBody(JSON.stringify({ question: 'szia' }))).toEqual({ question: 'szia', history: [] });
  });

  it('should return the question and history when both are present', () => {
    const history = [
      { role: 'user', content: 'korábbi kérdés' },
      { role: 'assistant', content: 'korábbi válasz' },
    ];

    expect(parseAskRequestBody(JSON.stringify({ question: 'szia', history }))).toEqual({
      question: 'szia',
      history,
    });
  });

  it('should reject a missing question field', () => {
    expect(() => parseAskRequestBody(JSON.stringify({}))).toThrow();
  });

  it('should reject an empty question', () => {
    expect(() => parseAskRequestBody(JSON.stringify({ question: '' }))).toThrow();
  });

  it('should reject invalid JSON', () => {
    expect(() => parseAskRequestBody('not json')).toThrow();
  });

  it('should reject a history entry with an invalid role', () => {
    expect(() =>
      parseAskRequestBody(JSON.stringify({ question: 'szia', history: [{ role: 'system', content: 'x' }] })),
    ).toThrow();
  });
});
