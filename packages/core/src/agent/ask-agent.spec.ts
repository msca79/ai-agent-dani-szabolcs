import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { askAgent } from './ask-agent';

function makeFakeClient(response: Partial<Anthropic.Message>): {
  client: Anthropic;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => response);
  const client = { messages: { create } } as unknown as Anthropic;

  return { client, create };
}

describe('askAgent (no tools)', () => {
  it('should extract and join text content blocks, without sending a tools param', async () => {
    const { client, create } = makeFakeClient({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Szia! Miben segíthetek?', citations: [] }],
    });

    const answer = await askAgent('szia', client);

    expect(answer).toEqual('Szia! Miben segíthetek?');
    expect(create).toHaveBeenCalledTimes(1);
    const callArgs = create.mock.calls[0][0];
    expect(callArgs.tools).toBeUndefined();
    expect(callArgs.messages).toEqual([{ role: 'user', content: 'szia' }]);
  });

  it('should return a fallback answer when the response has no text content', async () => {
    const { client } = makeFakeClient({
      stop_reason: 'refusal',
      content: [],
    });

    const answer = await askAgent('valami tiltott kérdés', client);

    expect(answer).toEqual('Erre jelenleg nem tudok válaszolni.');
  });
});
