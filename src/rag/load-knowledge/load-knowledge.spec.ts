import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type OpenAI from 'openai';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadKnowledge } from './load-knowledge';

function makeFakePool(): { pool: Pick<Pool, 'query'>; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async () => ({ rows: [], rowCount: 0 }) as unknown);
  return { pool: { query } as unknown as Pick<Pool, 'query'>, query };
}

function makeFakeOpenAi(behavior: (input: string[]) => { embedding: number[] }[]): OpenAI {
  const create = vi.fn(async ({ input }: { input: string[] }) => ({
    data: behavior(input).map((item, index) => ({ ...item, index, object: 'embedding' as const })),
    model: 'text-embedding-3-small',
    object: 'list' as const,
    usage: { prompt_tokens: input.length * 10, total_tokens: input.length * 10 },
  }));

  return { embeddings: { create } } as unknown as OpenAI;
}

describe('loadKnowledge', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'load-knowledge-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('should delete existing knowledge rows before loading new ones', async () => {
    await writeFile(join(dir, 'catan.txt'), 'egy rövid szabálykönyv');
    const { pool, query } = makeFakePool();
    const openAiClient = makeFakeOpenAi((input) => input.map(() => ({ embedding: [0.1, 0.2] })));

    await loadKnowledge(dir, { pool, openAiClient });

    expect(query.mock.calls[0]).toEqual(['DELETE FROM knowledge']);
  });

  it('should only process .txt files and insert one row per chunk with its embedding', async () => {
    await writeFile(join(dir, 'catan.txt'), 'egy rövid szabálykönyv');
    await writeFile(join(dir, 'ignoralando.md'), 'ezt ki kell hagyni');
    const { pool, query } = makeFakePool();
    const openAiClient = makeFakeOpenAi((input) => input.map(() => ({ embedding: [0.1, 0.2] })));

    const summary = await loadKnowledge(dir, { pool, openAiClient });

    const insertCalls = query.mock.calls.filter((call) => String(call[0]).includes('INSERT INTO knowledge'));
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]?.[1]).toEqual(['catan.txt', 1, 1, 'egy rövid szabálykönyv', 'fixed-size', '[0.1,0.2]']);

    expect(summary).toEqual({
      filesProcessed: 1,
      filesFailed: 0,
      totalChunks: 1,
      totalChunkingTokens: 0,
      totalEmbeddingTokens: 10,
    });
  });

  it('should continue with the remaining files when one file fails', async () => {
    await writeFile(join(dir, 'jo.txt'), 'jó szabálykönyv');
    await writeFile(join(dir, 'rossz.txt'), 'hibás szabálykönyv');
    const { pool } = makeFakePool();

    const create = vi.fn(async ({ input }: { input: string[] }) => {
      if (input[0]?.includes('hibás')) {
        throw new Error('embedding hiba');
      }
      return {
        data: input.map((_, index) => ({ embedding: [0.1], index, object: 'embedding' as const })),
        model: 'text-embedding-3-small',
        object: 'list' as const,
        usage: { prompt_tokens: 5, total_tokens: 5 },
      };
    });
    const openAiClient = { embeddings: { create } } as unknown as OpenAI;

    const summary = await loadKnowledge(dir, { pool, openAiClient });

    expect(summary.filesProcessed).toEqual(1);
    expect(summary.filesFailed).toEqual(1);
  });
});
