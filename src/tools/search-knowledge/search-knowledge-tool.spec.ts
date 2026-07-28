import type OpenAI from 'openai';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { executeSearchKnowledge } from './search-knowledge-tool';

function makeFakePool(rows: unknown[]): { pool: Pick<Pool, 'query'>; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async () => ({ rows }));

  return { pool: { query } as unknown as Pick<Pool, 'query'>, query };
}

function makeFakeOpenAi(embedding: number[]): OpenAI {
  const create = vi.fn(async () => ({
    data: [{ embedding, index: 0, object: 'embedding' as const }],
    model: 'text-embedding-3-small',
    object: 'list' as const,
    usage: { prompt_tokens: 5, total_tokens: 5 },
  }));

  return { embeddings: { create } } as unknown as OpenAI;
}

describe('executeSearchKnowledge', () => {
  it('should embed the query and search the knowledge table by cosine distance, limited to 5 rows', async () => {
    const { pool, query } = makeFakePool([
      { file_name: 'catan.txt', start_line: 1, end_line: 10, chunk_text: 'építkezés szabályai' },
    ]);
    const openAiClient = makeFakeOpenAi([0.1, 0.2, 0.3]);

    const result = await executeSearchKnowledge({ query: 'hogyan kell építkezni?' }, pool, openAiClient);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY embedding <=> $1'),
      ['[0.1,0.2,0.3]'],
    );
    expect(query.mock.calls[0]?.[0]).toContain('LIMIT 5');
    expect(result).toEqual([{ fileName: 'catan.txt', startLine: 1, endLine: 10, text: 'építkezés szabályai' }]);
  });

  it('should reject an empty query before calling the embedding client', async () => {
    const { pool } = makeFakePool([]);
    const openAiClient = makeFakeOpenAi([0.1]);

    await expect(executeSearchKnowledge({ query: '' }, pool, openAiClient)).rejects.toThrow();
  });
});
