import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertRulebookPdf } from './convert-rulebook';

interface FakeStream {
  finalMessage: () => Promise<Partial<Anthropic.Message>>;
}

function makeFakeClient(response: Partial<Anthropic.Message>): {
  client: Anthropic;
  stream: ReturnType<typeof vi.fn>;
} {
  const stream = vi.fn(
    (): FakeStream => ({
      finalMessage: async () => response,
    }),
  );

  const client = { messages: { stream } } as unknown as Anthropic;

  return { client, stream };
}

describe('convertRulebookPdf', () => {
  let dir: string;
  let pdfPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'convert-rulebook-'));
    pdfPath = join(dir, 'catan.pdf');
    await writeFile(pdfPath, Buffer.from('%PDF-1.4 fake content'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('should send the pdf as a base64 document block alongside the prompt', async () => {
    const { client, stream } = makeFakeClient({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: '# Catan szabályok', citations: [] }],
    });

    await convertRulebookPdf(pdfPath, client);

    const call = stream.mock.calls[0][0];
    expect(call.model).toEqual('claude-haiku-4-5');
    const content = call.messages[0].content;
    expect(content[0]).toMatchObject({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf' },
      title: 'catan.pdf',
    });
    expect(content[1].type).toEqual('text');
    expect(content[1].text).toContain('RAG-optimált');
  });

  it('should join and return the text content blocks', async () => {
    const { client } = makeFakeClient({
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: '# Catan szabályok', citations: [] },
        { type: 'text', text: 'második bekezdés', citations: [] },
      ],
    });

    const result = await convertRulebookPdf(pdfPath, client);

    expect(result).toEqual('# Catan szabályok\n\nmásodik bekezdés');
  });

  it('should throw when the model refuses the request', async () => {
    const { client } = makeFakeClient({ stop_reason: 'refusal', content: [] });

    await expect(convertRulebookPdf(pdfPath, client)).rejects.toThrow('elutasította');
  });

  it('should throw when the response has no text content', async () => {
    const { client } = makeFakeClient({ stop_reason: 'end_turn', content: [] });

    await expect(convertRulebookPdf(pdfPath, client)).rejects.toThrow('Üres válasz');
  });
});
