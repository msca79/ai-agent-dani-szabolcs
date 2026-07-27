import type Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { askAgent } from './ask-agent';

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

    const textListeners: Array<(delta: string) => void> = [];
    const fakeStream: FakeStream = {
      on(event, listener) {
        if (event === 'text') {
          textListeners.push(listener);
        }
        return fakeStream;
      },
      finalMessage: async () => {
        for (const block of response.content ?? []) {
          if ((block as { type?: string }).type === 'text') {
            for (const listener of textListeners) {
              listener((block as Anthropic.TextBlock).text);
            }
          }
        }
        return response;
      },
    };

    return fakeStream;
  });

  const client = { messages: { stream } } as unknown as Anthropic;

  return { client, stream };
}

function makeFakePool(rows: unknown[]): Pick<Pool, 'query'> {
  return { query: vi.fn(async () => ({ rows })) } as unknown as Pick<Pool, 'query'>;
}

describe('askAgent', () => {
  beforeEach(() => {
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should extract and join text content blocks when no tool is used', async () => {
    const { client, stream } = makeFakeClient({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Szia! Miben segíthetek?', citations: [] }],
    });

    const answer = await askAgent('szia', { client, pool: makeFakePool([]) });

    expect(answer).toEqual('Szia! Miben segíthetek?');
    expect(stream).toHaveBeenCalledTimes(1);
    expect(stream.mock.calls[0][0].messages).toEqual([{ role: 'user', content: 'szia' }]);
  });

  it('should return a fallback answer when the response has no text content', async () => {
    const { client } = makeFakeClient({ stop_reason: 'refusal', content: [] });

    const answer = await askAgent('valami tiltott kérdés', { client, pool: makeFakePool([]) });

    expect(answer).toEqual('Erre jelenleg nem tudok válaszolni.');
  });

  it('should seed the conversation with prior history before the new question', async () => {
    const { client, stream } = makeFakeClient({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Persze, szívesen!', citations: [] }],
    });
    const history = [
      { role: 'user' as const, content: 'Szia, kártyajátékot keresek.' },
      { role: 'assistant' as const, content: 'Milyen létszámra?' },
    ];

    await askAgent('Ketten leszünk.', { client, pool: makeFakePool([]), history });

    expect(stream.mock.calls[0][0].messages).toEqual([
      { role: 'user', content: 'Szia, kártyajátékot keresek.' },
      { role: 'assistant', content: 'Milyen létszámra?' },
      { role: 'user', content: 'Ketten leszünk.' },
    ]);
  });

  it('should forward streamed text deltas via onTextDelta as they arrive', async () => {
    const { client } = makeFakeClient({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Ajánlom a Dobble-t.', citations: [] }],
    });
    const deltas: string[] = [];

    await askAgent('szia', { client, pool: makeFakePool([]), onTextDelta: (delta) => deltas.push(delta) });

    expect(deltas).toEqual(['Ajánlom a Dobble-t.']);
  });

  it('should execute run_sql and feed the result back as a tool_result, then return the final text', async () => {
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
    const { client, stream } = makeFakeClient(toolUseResponse, finalResponse);
    const pool = makeFakePool([{ id: 1, name: 'Dobble' }]);

    const answer = await askAgent('3-an, max 30 perc, parti', { client, pool });

    expect(answer).toEqual('Ajánlom a Dobble-t.');
    expect(stream).toHaveBeenCalledTimes(2);

    const secondCallMessages = stream.mock.calls[1][0].messages;
    const toolResultMessage = secondCallMessages[secondCallMessages.length - 1];
    expect(toolResultMessage).toEqual({
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: JSON.stringify([{ id: 1, name: 'Dobble' }]) }],
    });
  });

  it('should throw after exactly MAX_TOOL_ITERATIONS calls if the model keeps requesting tools', async () => {
    const alwaysToolUse: Partial<Anthropic.Message> = {
      stop_reason: 'tool_use',
      content: [
        { type: 'tool_use', id: 'toolu_x', name: 'run_sql', caller: { type: 'direct' }, input: { query: 'SELECT 1' } },
      ],
    };
    const { client, stream } = makeFakeClient(alwaysToolUse);
    const pool = makeFakePool([]);

    await expect(askAgent('sosem áll le', { client, pool })).rejects.toThrow(
      'A tool-use loop túllépte a maximális iterációszámot.',
    );
    expect(stream).toHaveBeenCalledTimes(5);
  });
});
