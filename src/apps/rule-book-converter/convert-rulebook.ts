import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '../../agents/client/anthropic-client';
import { RULEBOOK_CONVERSION_PROMPT } from './rulebook-prompt';

const MODEL = 'claude-haiku-4-5';
// Streamelve hívunk, hogy egy hosszú, részletes szabálykönyv-átirat se
// fusson HTTP timeoutba (lásd agent-loop.ts azonos mintáját).
const MAX_TOKENS = 64000;

export async function convertRulebookPdf(pdfPath: string, client: Anthropic = getAnthropicClient()): Promise<string> {
  const pdfBuffer = await readFile(pdfPath);

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBuffer.toString('base64'),
            },
            title: basename(pdfPath),
          },
          { type: 'text', text: RULEBOOK_CONVERSION_PROMPT },
        ],
      },
    ],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === 'refusal') {
    throw new Error(`A modell elutasította a kérést (${basename(pdfPath)}).`);
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n\n')
    .trim();

  if (!text) {
    throw new Error(`Üres válasz érkezett a modelltől (${basename(pdfPath)}).`);
  }

  return text;
}
