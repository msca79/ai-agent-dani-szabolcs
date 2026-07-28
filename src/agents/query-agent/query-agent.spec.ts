import type Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAgent } from './query-agent';
import { QUERY_AGENT_SYSTEM_PROMPT } from './query-agent-prompt';

interface FakeStream {
  on: (event: string, listener: (delta: string) => void) => FakeStream;
  finalMessage: () => Promise<Partial<Anthropic.Message>>;
}

function makeFakeClient(...responses: Partial<Anthropic.Message>[]): {
  client: Anthropic;
  stream: ReturnType<typeof vi.fn>;
} {
  let call = 0;
  const stream = vi.fn((): FakeStream => {
    const response = responses[Math.min(call, responses.length - 1)];
    call++;
    const fakeStream: FakeStream = {
      on: () => fakeStream,
      finalMessage: async () => response,
    };
    return fakeStream;
  });

  const client = { messages: { stream } } as unknown as Anthropic;

  return { client, stream };
}

function makeFakePool(rows: unknown[]): { pool: Pick<Pool, 'query'>; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async () => ({ rows }));

  return { pool: { query } as unknown as Pick<Pool, 'query'>, query };
}

describe('queryAgent', () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call the LLM with the query-agent system prompt and the run_sql tool', async () => {
    const { client, stream } = makeFakeClient({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Szia! Miben segíthetek?', citations: [] }],
    });
    const { pool } = makeFakePool([]);

    await queryAgent('szia', { client, pool });

    expect(stream.mock.calls[0][0].system).toEqual(QUERY_AGENT_SYSTEM_PROMPT);
    expect(stream.mock.calls[0][0].tools).toEqual([
      expect.objectContaining({ name: 'run_sql' }),
      expect.objectContaining({ name: 'search_knowledge' }),
    ]);
  });

  it('should execute run_sql against the given pool and return the final answer', async () => {
    const toolUseResponse: Partial<Anthropic.Message> = {
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'run_sql',
          caller: { type: 'direct' },
          input: { query: 'SELECT * FROM games WHERE players_min <= 3 AND players_max >= 3' },
        },
      ],
    };
    const finalResponse: Partial<Anthropic.Message> = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Ajánlom a Dobble-t.', citations: [] }],
    };
    const { client } = makeFakeClient(toolUseResponse, finalResponse);
    const { pool, query } = makeFakePool([{ id: 1, name: 'Dobble' }]);

    const answer = await queryAgent('3-an, max 30 perc, parti', { client, pool });

    expect(answer).toEqual('Ajánlom a Dobble-t.');
    expect(query).toHaveBeenCalledWith(
      'SELECT * FROM (SELECT * FROM games WHERE players_min <= 3 AND players_max >= 3) AS run_sql_subquery LIMIT 100',
    );
  });
});
