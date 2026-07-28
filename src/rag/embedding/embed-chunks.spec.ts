import type OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';
import type { Chunk } from '../chunking/chunk';
import { embedChunks } from './embed-chunks';

function makeFakeClient(data: { embedding: number[]; index: number }[], totalTokens: number): {
  client: OpenAI;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => ({
    data: data.map((item) => ({ ...item, object: 'embedding' as const })),
    model: 'text-embedding-3-small',
    object: 'list' as const,
    usage: { prompt_tokens: totalTokens, total_tokens: totalTokens },
  }));
  const client = { embeddings: { create } } as unknown as OpenAI;

  return { client, create };
}

const chunks: Chunk[] = [
  { fileName: 'catan.txt', startLine: 1, endLine: 10, text: 'első chunk' },
  { fileName: 'catan.txt', startLine: 11, endLine: 20, text: 'második chunk' },
];

describe('embedChunks', () => {
  it('should call the embeddings endpoint with the chunk texts and pair results back to their chunks', async () => {
    const { client, create } = makeFakeClient(
      [
        { embedding: [0.1, 0.2], index: 0 },
        { embedding: [0.3, 0.4], index: 1 },
      ],
      42,
    );

    const result = await embedChunks(chunks, client);

    expect(create).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: ['első chunk', 'második chunk'],
    });
    expect(result.tokensUsed).toEqual(42);
    expect(result.embeddedChunks).toEqual([
      { chunk: chunks[0], embedding: [0.1, 0.2] },
      { chunk: chunks[1], embedding: [0.3, 0.4] },
    ]);
  });

  it('should pair chunks correctly even when the API returns embeddings out of order', async () => {
    const { client } = makeFakeClient(
      [
        { embedding: [0.3, 0.4], index: 1 },
        { embedding: [0.1, 0.2], index: 0 },
      ],
      42,
    );

    const result = await embedChunks(chunks, client);

    expect(result.embeddedChunks).toEqual([
      { chunk: chunks[0], embedding: [0.1, 0.2] },
      { chunk: chunks[1], embedding: [0.3, 0.4] },
    ]);
  });

  it('should return an empty result without calling the API for an empty chunk list', async () => {
    const { client, create } = makeFakeClient([], 0);

    const result = await embedChunks([], client);

    expect(create).not.toHaveBeenCalled();
    expect(result).toEqual({ embeddedChunks: [], tokensUsed: 0 });
  });
});
