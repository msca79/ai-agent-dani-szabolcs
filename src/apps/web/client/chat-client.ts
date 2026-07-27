import type { ConversationTurn } from '../../../agents/ask-agent/ask-agent';

interface AskErrorResponse {
  error?: string;
}

const FALLBACK_ERROR = 'Váratlan hiba történt.';

export async function askQuestion(
  question: string,
  history: ConversationTurn[],
  onChunk: (chunk: string) => void,
): Promise<string> {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as AskErrorResponse;
    throw new Error(body.error ?? FALLBACK_ERROR);
  }

  if (!response.body) {
    throw new Error(FALLBACK_ERROR);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    onChunk(chunk);
  }

  return fullText;
}
