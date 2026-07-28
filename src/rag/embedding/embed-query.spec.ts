import type OpenAI from 'openai';
import { describe, expect, it, vi } from 'vitest';
import { embedQuery } from './embed-query';

function makeFakeClient(embedding: number[], totalTokens: number): { client: OpenAI; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => ({
    data: [{ embedding, index: 0, object: 'embedding' as const }],
    model: 'text-embedding-3-small',
    object: 'list' as const,
    usage: { prompt_tokens: totalTokens, total_tokens: totalTokens },
  }));
  const client = { embeddings: { create } } as unknown as OpenAI;

  return { client, create };
}

describe('embedQuery', () => {
  it('should embed the given query text and return the vector with token usage', async () => {
    const { client, create } = makeFakeClient([0.1, 0.2, 0.3], 7);

    const result = await embedQuery('hogyan kell építkezni Catanban?', client);

    expect(create).toHaveBeenCalledWith({ model: 'text-embedding-3-small', input: 'hogyan kell építkezni Catanban?' });
    expect(result).toEqual({ embedding: [0.1, 0.2, 0.3], tokensUsed: 7 });
  });

  it('should throw when the API returns no embedding', async () => {
    const create = vi.fn(async () => ({
      data: [],
      model: 'text-embedding-3-small',
      object: 'list' as const,
      usage: { prompt_tokens: 0, total_tokens: 0 },
    }));
    const client = { embeddings: { create } } as unknown as OpenAI;

    await expect(embedQuery('valami', client)).rejects.toThrow('Nem érkezett embedding');
  });
});
