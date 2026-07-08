import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from './anthropic-client';
import { SYSTEM_PROMPT } from './system-prompt';

const MODEL = process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-5';
const MAX_TOKENS = 1024;
const FALLBACK_ANSWER = 'Erre jelenleg nem tudok válaszolni.';

export async function askAgent(question: string, client: Anthropic = getAnthropicClient()): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: question }],
  });

  return extractText(response);
}

function extractText(response: Anthropic.Message): string {
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return text || FALLBACK_ANSWER;
}
