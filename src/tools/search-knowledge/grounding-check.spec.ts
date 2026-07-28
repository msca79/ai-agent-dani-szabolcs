import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { checkGrounding } from './grounding-check';
import type { KnowledgeSearchResult } from './knowledge-search-result';

function makeFakeClient(parsedOutput: unknown, usage: { input_tokens: number; output_tokens: number }): {
  client: Anthropic;
  parse: ReturnType<typeof vi.fn>;
} {
  const parse = vi.fn(async () => ({ parsed_output: parsedOutput, usage }));
  const client = { messages: { parse } } as unknown as Anthropic;

  return { client, parse };
}

const chunks: KnowledgeSearchResult[] = [
  { fileName: 'catan.txt', startLine: 10, endLine: 15, text: 'egy építkezéshez egy fa és egy agyag szükséges' },
];

describe('checkGrounding', () => {
  it('should return the parsed grounding verdict with token usage', async () => {
    const { client, parse } = makeFakeClient(
      { grounded: true, notes: 'A válasz megfelel a forrásnak.' },
      { input_tokens: 80, output_tokens: 20 },
    );

    const result = await checkGrounding(
      'mibe kerül egy építkezés?',
      'Egy építkezéshez egy fa és egy agyag kell.',
      chunks,
      client,
    );

    expect(parse).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ grounded: true, notes: 'A válasz megfelel a forrásnak.', tokensUsed: 100 });
  });

  it('should flag an answer that contradicts the sources', async () => {
    const { client } = makeFakeClient(
      { grounded: false, notes: 'A forrás nem említ vasat, a válasz mégis azt állítja.' },
      { input_tokens: 80, output_tokens: 20 },
    );

    const result = await checkGrounding(
      'mibe kerül egy építkezés?',
      'Egy építkezéshez egy vas kell.',
      chunks,
      client,
    );

    expect(result.grounded).toEqual(false);
  });

  it('should fail open (grounded: true) when the model returns no parsed output', async () => {
    const { client } = makeFakeClient(null, { input_tokens: 10, output_tokens: 5 });

    const result = await checkGrounding('kérdés', 'válasz', chunks, client);

    expect(result.grounded).toEqual(true);
    expect(result.notes).toContain('Nem sikerült ellenőrizni');
  });
});
