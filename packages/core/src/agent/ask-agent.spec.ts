import type Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { askAgent } from './ask-agent';

function makeFakeClient(...responses: Partial<Anthropic.Message>[]): {
  client: Anthropic;
  create: ReturnType<typeof vi.fn>;
} {
  let call = 0;
  const create = vi.fn(async () => responses[Math.min(call++, responses.length - 1)]);
  const client = { messages: { create } } as unknown as Anthropic;

  return { client, create };
}

function makeFakePool(rows: unknown[]): Pick<Pool, 'query'> {
  return { query: vi.fn(async () => ({ rows })) } as unknown as Pick<Pool, 'query'>;
}

describe('askAgent', () => {
  it('should extract and join text content blocks when no tool is used', async () => {
    const { client, create } = makeFakeClient({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Szia! Miben segíthetek?', citations: [] }],
    });

    const answer = await askAgent('szia', { client, pool: makeFakePool([]) });

    expect(answer).toEqual('Szia! Miben segíthetek?');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].messages).toEqual([{ role: 'user', content: 'szia' }]);
  });

  it('should return a fallback answer when the response has no text content', async () => {
    const { client } = makeFakeClient({ stop_reason: 'refusal', content: [] });

    const answer = await askAgent('valami tiltott kérdés', { client, pool: makeFakePool([]) });

    expect(answer).toEqual('Erre jelenleg nem tudok válaszolni.');
  });

  it('should execute search_games and feed the result back as a tool_result, then return the final text', async () => {
    const toolUseResponse: Partial<Anthropic.Message> = {
      stop_reason: 'tool_use',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'search_games',
          input: { players: 3, playtime: 30 },
        },
      ],
    };
    const finalResponse: Partial<Anthropic.Message> = {
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Ajánlom a Dobble-t.', citations: [] }],
    };
    const { client, create } = makeFakeClient(toolUseResponse, finalResponse);
    const pool = makeFakePool([{ id: 1, name: 'Dobble' }]);

    const answer = await askAgent('3-an, max 30 perc, parti', { client, pool });

    expect(answer).toEqual('Ajánlom a Dobble-t.');
    expect(create).toHaveBeenCalledTimes(2);

    const secondCallMessages = create.mock.calls[1][0].messages;
    const toolResultMessage = secondCallMessages[secondCallMessages.length - 1];
    expect(toolResultMessage).toEqual({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: JSON.stringify([{ id: 1, name: 'Dobble' }]) }],
    });
  });

  it('should throw after exactly MAX_TOOL_ITERATIONS calls if the model keeps requesting tools', async () => {
    const alwaysToolUse: Partial<Anthropic.Message> = {
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 'toolu_x', name: 'search_games', input: {} }],
    };
    const { client, create } = makeFakeClient(alwaysToolUse);
    const pool = makeFakePool([]);

    await expect(askAgent('sosem áll le', { client, pool })).rejects.toThrow(
      'A tool-use loop túllépte a maximális iterációszámot.',
    );
    expect(create).toHaveBeenCalledTimes(5);
  });
});
