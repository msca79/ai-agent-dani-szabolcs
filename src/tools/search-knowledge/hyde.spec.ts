import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { generateHypotheticalDocument } from './hyde';

function makeFakeClient(response: Partial<Anthropic.Message>): { client: Anthropic; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => response);
  const client = { messages: { create } } as unknown as Anthropic;

  return { client, create };
}

describe('generateHypotheticalDocument', () => {
  it('should ask the model for a hypothetical rulebook excerpt and return it with token usage', async () => {
    const { client, create } = makeFakeClient({
      content: [{ type: 'text', text: 'Egy építkezéshez két gabona és egy fa szükséges.', citations: [] }],
      usage: { input_tokens: 30, output_tokens: 20 } as Anthropic.Usage,
    });

    const result = await generateHypotheticalDocument('mibe kerül egy építkezés?', client);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5',
        messages: [{ role: 'user', content: 'mibe kerül egy építkezés?' }],
      }),
    );
    expect(result).toEqual({ hypotheticalDocument: 'Egy építkezéshez két gabona és egy fa szükséges.', tokensUsed: 50 });
  });

  it('should fall back to the original query when the model returns no text', async () => {
    const { client } = makeFakeClient({
      content: [],
      usage: { input_tokens: 10, output_tokens: 0 } as Anthropic.Usage,
    });

    const result = await generateHypotheticalDocument('mi az a kikötő?', client);

    expect(result.hypotheticalDocument).toEqual('mi az a kikötő?');
  });
});
