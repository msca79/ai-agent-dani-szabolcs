import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeSearchKnowledge } from './search-knowledge-tool';

function makeFakePool(rows: unknown[]): { pool: Pick<Pool, 'query'>; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async () => ({ rows }));

  return { pool: { query } as unknown as Pick<Pool, 'query'>, query };
}

function makeFakeOpenAi(): { client: OpenAI; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async ({ input }: { input: string }) => ({
    data: [{ embedding: [input.length / 100, 0.5], index: 0, object: 'embedding' as const }],
    model: 'text-embedding-3-small',
    object: 'list' as const,
    usage: { prompt_tokens: 5, total_tokens: 5 },
  }));

  return { client: { embeddings: { create } } as unknown as OpenAI, create };
}

// HyDE (messages.create) és rerank (messages.parse) is ugyanarra a klienstípusra hívódik, de két külön metódusra.
function makeFakeAnthropic(): { client: Anthropic; create: ReturnType<typeof vi.fn>; parse: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => ({
    content: [{ type: 'text', text: 'egy hipotetikus szabályrészlet', citations: [] }],
    usage: { input_tokens: 20, output_tokens: 10 },
  }));
  const parse = vi.fn(async () => ({
    parsed_output: { rankedIndices: [1, 0] },
    usage: { input_tokens: 40, output_tokens: 15 },
  }));

  return { client: { messages: { create, parse } } as unknown as Anthropic, create, parse };
}

describe('executeSearchKnowledge', () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should run the full HyDE + rerank pipeline: widen the candidate pool, embed the hypothetical document, then rerank down to 5', async () => {
    const rows = [
      { file_name: 'catan.txt', start_line: 1, end_line: 5, chunk_text: 'irreleváns rész' },
      { file_name: 'catan.txt', start_line: 10, end_line: 15, chunk_text: 'építkezés szabályai' },
    ];
    const { pool, query } = makeFakePool(rows);
    const { client: openAiClient, create: embedCreate } = makeFakeOpenAi();
    const { client: anthropicClient, create: hydeCreate, parse: rerankParse } = makeFakeAnthropic();

    const result = await executeSearchKnowledge({ query: 'hogyan kell építkezni?' }, pool, openAiClient, anthropicClient);

    // HyDE lefutott, és az embedelt szöveg a hipotetikus dokumentum volt, nem a nyers kérdés.
    expect(hydeCreate).toHaveBeenCalledTimes(1);
    expect(embedCreate).toHaveBeenCalledWith(
      expect.objectContaining({ input: 'egy hipotetikus szabályrészlet' }),
    );

    // A vektor-keresés a szélesebb (rerank) jelölt-poolra ment, nem a végleges top-5-re.
    expect(query.mock.calls[0]?.[0]).toContain('LIMIT 15');

    // A rerank megkapta az eredeti kérdést (nem a HyDE-szöveget), és a végeredmény a rangsorolt sorrend.
    expect(rerankParse).toHaveBeenCalledTimes(1);
    const rerankCallContent = rerankParse.mock.calls[0]?.[0]?.messages?.[0]?.content;
    expect(rerankCallContent).toContain('hogyan kell építkezni?');

    expect(result).toEqual([
      { fileName: 'catan.txt', startLine: 10, endLine: 15, text: 'építkezés szabályai' },
      { fileName: 'catan.txt', startLine: 1, endLine: 5, text: 'irreleváns rész' },
    ]);
  });

  it('should reject an empty query before calling either LLM', async () => {
    const { pool } = makeFakePool([]);
    const { client: openAiClient } = makeFakeOpenAi();
    const { client: anthropicClient, create, parse } = makeFakeAnthropic();

    await expect(executeSearchKnowledge({ query: '' }, pool, openAiClient, anthropicClient)).rejects.toThrow();
    expect(create).not.toHaveBeenCalled();
    expect(parse).not.toHaveBeenCalled();
  });
});
