import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import type { KnowledgeSearchResult } from './knowledge-search-result';
import { rerankChunks } from './rerank';

function makeFakeClient(parsedOutput: unknown, usage: { input_tokens: number; output_tokens: number }): {
  client: Anthropic;
  parse: ReturnType<typeof vi.fn>;
} {
  const parse = vi.fn(async () => ({ parsed_output: parsedOutput, usage }));
  const client = { messages: { parse } } as unknown as Anthropic;

  return { client, parse };
}

const candidates: KnowledgeSearchResult[] = [
  { fileName: 'catan.txt', startLine: 1, endLine: 5, text: 'irreleváns rész' },
  { fileName: 'catan.txt', startLine: 10, endLine: 15, text: 'építkezés szabályai' },
  { fileName: 'catan.txt', startLine: 20, endLine: 25, text: 'kereskedelem szabályai' },
];

describe('rerankChunks', () => {
  it('should reorder and narrow the candidates to topK based on the parsed ranking', async () => {
    const { client, parse } = makeFakeClient({ rankedIndices: [1, 2, 0] }, { input_tokens: 100, output_tokens: 30 });

    const result = await rerankChunks('hogyan kell építkezni?', candidates, 2, client);

    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.tokensUsed).toEqual(130);
    expect(result.chunks).toEqual([candidates[1], candidates[2]]);
  });

  it('should ignore out-of-range indices from the model', async () => {
    const { client } = makeFakeClient({ rankedIndices: [99, 1, -1] }, { input_tokens: 10, output_tokens: 5 });

    const result = await rerankChunks('kérdés', candidates, 5, client);

    expect(result.chunks).toEqual([candidates[1]]);
  });

  it('should fall back to the first topK candidates when the model returns no parsed output', async () => {
    const { client } = makeFakeClient(null, { input_tokens: 10, output_tokens: 5 });

    const result = await rerankChunks('kérdés', candidates, 2, client);

    expect(result.chunks).toEqual(candidates.slice(0, 2));
  });

  it('should return an empty result without calling the model for an empty candidate list', async () => {
    const { client, parse } = makeFakeClient(null, { input_tokens: 0, output_tokens: 0 });

    const result = await rerankChunks('kérdés', [], 5, client);

    expect(parse).not.toHaveBeenCalled();
    expect(result).toEqual({ chunks: [], tokensUsed: 0 });
  });
});
