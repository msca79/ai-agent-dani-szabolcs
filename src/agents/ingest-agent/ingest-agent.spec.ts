import type Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ingestAgent } from './ingest-agent';
import { INGEST_AGENT_SYSTEM_PROMPT } from './ingest-agent-prompt';

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
      finalMessage: async () => ({ usage: { input_tokens: 0, output_tokens: 0 } as Anthropic.Usage, ...response }),
    };
    return fakeStream;
  });

  const client = { messages: { stream } } as unknown as Anthropic;

  return { client, stream };
}

function makeFakePool(rowCount = 0): { pool: Pick<Pool, 'query'>; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async () => ({ rows: [], rowCount }));

  return { pool: { query } as unknown as Pick<Pool, 'query'>, query };
}

describe('ingestAgent', () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call the LLM with the ingest-agent system prompt and all three tools', async () => {
    const { client, stream } = makeFakeClient({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Miben segíthetek?', citations: [] }],
    });
    const { pool: readPool } = makeFakePool();
    const { pool: writePool } = makeFakePool();

    await ingestAgent('szia', { client, readPool, writePool });

    expect(stream.mock.calls[0][0].system).toEqual(INGEST_AGENT_SYSTEM_PROMPT);
    const toolNames = (stream.mock.calls[0][0].tools as Array<{ name: string }>).map((tool) => tool.name);
    expect(toolNames).toEqual(['run_sql', 'upsertProduct', 'fetchGameDescription']);
  });

  it('should dispatch run_sql against the read pool, not the write pool', async () => {
    const toolUseResponse: Partial<Anthropic.Message> = {
      stop_reason: 'tool_use',
      content: [
        { type: 'tool_use', id: 'toolu_1', name: 'run_sql', caller: { type: 'direct' }, input: { query: 'SELECT * FROM games' } },
      ],
    };
    const finalResponse: Partial<Anthropic.Message> = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Megvan.', citations: [] }],
    };
    const { client } = makeFakeClient(toolUseResponse, finalResponse);
    const { pool: readPool, query: readQuery } = makeFakePool();
    const { pool: writePool, query: writeQuery } = makeFakePool();

    await ingestAgent('mutasd a Dobble-t', { client, readPool, writePool });

    expect(readQuery).toHaveBeenCalled();
    expect(writeQuery).not.toHaveBeenCalled();
  });

  it('should dispatch upsertProduct against the write pool, not the read pool', async () => {
    const toolUseResponse: Partial<Anthropic.Message> = {
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_2',
          name: 'upsertProduct',
          caller: { type: 'direct' },
          input: { name: 'Dobble', stock: 12 },
        },
      ],
    };
    const finalResponse: Partial<Anthropic.Message> = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Frissítve.', citations: [] }],
    };
    const { client } = makeFakeClient(toolUseResponse, finalResponse);
    const { pool: readPool, query: readQuery } = makeFakePool();
    const { pool: writePool, query: writeQuery } = makeFakePool(1);

    const answer = await ingestAgent('állítsd 12-re a Dobble készletét', { client, readPool, writePool });

    expect(answer).toEqual('Frissítve.');
    expect(writeQuery).toHaveBeenCalled();
    expect(readQuery).not.toHaveBeenCalled();
  });

  it('should serve fetchGameDescription without needing either pool', async () => {
    const toolUseResponse: Partial<Anthropic.Message> = {
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_3',
          name: 'fetchGameDescription',
          caller: { type: 'direct' },
          input: { gameName: 'Dobble' },
        },
      ],
    };
    const finalResponse: Partial<Anthropic.Message> = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Ez csak mock adat.', citations: [] }],
    };
    const { client, stream } = makeFakeClient(toolUseResponse, finalResponse);
    const { pool: readPool } = makeFakePool();
    const { pool: writePool } = makeFakePool();

    const answer = await ingestAgent('kérj le egy leírást a Dobble-hoz', { client, readPool, writePool });

    expect(answer).toEqual('Ez csak mock adat.');
    const secondCallMessages = stream.mock.calls[1][0].messages;
    const toolResultMessage = secondCallMessages[secondCallMessages.length - 1];
    expect(toolResultMessage.content[0].content).toContain('mock');
  });
});
