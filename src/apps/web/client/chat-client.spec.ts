import { afterEach, describe, expect, it, vi } from 'vitest';
import { askQuestion } from './chat-client';

function makeStreamedResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, { status });
}

describe('askQuestion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should POST the question with an empty history by default', async () => {
    const fetchMock = vi.fn(async () => makeStreamedResponse(['Ajánlom a Dobble-t.']));
    vi.stubGlobal('fetch', fetchMock);

    await askQuestion('gyors kártyajáték?', [], () => undefined);

    expect(fetchMock).toHaveBeenCalledWith('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'gyors kártyajáték?', history: [] }),
    });
  });

  it('should include the given history in the request body', async () => {
    const fetchMock = vi.fn(async () => makeStreamedResponse(['ok']));
    vi.stubGlobal('fetch', fetchMock);
    const history = [
      { role: 'user' as const, content: 'szia' },
      { role: 'assistant' as const, content: 'Szia! Miben segíthetek?' },
    ];

    await askQuestion('kérdés', history, () => undefined);

    expect(fetchMock).toHaveBeenCalledWith('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'kérdés', history }),
    });
  });

  it('should forward each streamed chunk via onChunk and resolve with the full concatenated text', async () => {
    const fetchMock = vi.fn(async () => makeStreamedResponse(['Ajánlom ', 'a Dobble-t.']));
    vi.stubGlobal('fetch', fetchMock);
    const chunks: string[] = [];

    const answer = await askQuestion('gyors kártyajáték?', [], (chunk) => chunks.push(chunk));

    expect(chunks).toEqual(['Ajánlom ', 'a Dobble-t.']);
    expect(answer).toEqual('Ajánlom a Dobble-t.');
  });

  it('should throw with the server error message when the response is not ok', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Hiányzik az ANTHROPIC_API_KEY.' }), { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(askQuestion('szia', [], () => undefined)).rejects.toThrow('Hiányzik az ANTHROPIC_API_KEY.');
  });

  it('should throw a fallback message when a non-ok response has no error body', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(askQuestion('szia', [], () => undefined)).rejects.toThrow('Váratlan hiba történt.');
  });
});
