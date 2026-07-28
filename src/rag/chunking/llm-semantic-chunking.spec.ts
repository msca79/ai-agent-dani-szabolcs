import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { chunkLlmSemantic } from './llm-semantic-chunking';

function makeFakeClient(parsedOutput: unknown, usage: { input_tokens: number; output_tokens: number }): {
  client: Anthropic;
  parse: ReturnType<typeof vi.fn>;
} {
  const parse = vi.fn(async () => ({ parsed_output: parsedOutput, usage }));
  const client = { messages: { parse } } as unknown as Anthropic;

  return { client, parse };
}

describe('chunkLlmSemantic', () => {
  const text = ['# Cím', '## Első szakasz', 'valami szabály', '## Második szakasz', 'másik szabály'].join('\n');

  it('should send the numbered text to the model and slice chunks from the parsed section boundaries', async () => {
    const { client, parse } = makeFakeClient(
      { sections: [{ startLine: 1, endLine: 3 }, { startLine: 4, endLine: 5 }] },
      { input_tokens: 120, output_tokens: 40 },
    );

    const result = await chunkLlmSemantic('teszt.txt', text, client);

    expect(parse).toHaveBeenCalledTimes(1);
    const call = parse.mock.calls[0][0];
    expect(call.model).toEqual('claude-haiku-4-5');
    expect(call.messages[0].content).toEqual(
      ['1: # Cím', '2: ## Első szakasz', '3: valami szabály', '4: ## Második szakasz', '5: másik szabály'].join('\n'),
    );

    expect(result.tokensUsed).toEqual(160);
    expect(result.chunks).toEqual([
      { fileName: 'teszt.txt', startLine: 1, endLine: 3, text: '# Cím\n## Első szakasz\nvalami szabály' },
      { fileName: 'teszt.txt', startLine: 4, endLine: 5, text: '## Második szakasz\nmásik szabály' },
    ]);
  });

  it('should clamp a section endLine that overshoots the actual line count', async () => {
    const { client } = makeFakeClient({ sections: [{ startLine: 1, endLine: 999 }] }, { input_tokens: 10, output_tokens: 5 });

    const result = await chunkLlmSemantic('teszt.txt', text, client);

    expect(result.chunks).toEqual([{ fileName: 'teszt.txt', startLine: 1, endLine: 5, text }]);
  });

  it('should throw when the model returns no parsed output', async () => {
    const { client } = makeFakeClient(null, { input_tokens: 10, output_tokens: 5 });

    await expect(chunkLlmSemantic('teszt.txt', text, client)).rejects.toThrow('szemantikus szakaszhatárokat');
  });
});
