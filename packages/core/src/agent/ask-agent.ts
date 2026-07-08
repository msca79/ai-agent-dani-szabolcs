import Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import { getReadOnlyPool } from '../db/read-only-pool';
import { executeSearchGames, searchGamesTool } from '../tools/search-games/search-games-tool';
import { getAnthropicClient } from './anthropic-client';
import { SYSTEM_PROMPT } from './system-prompt';

const MODEL = process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-5';
const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 5;
const FALLBACK_ANSWER = 'Erre jelenleg nem tudok válaszolni.';

export interface AskAgentDeps {
  client?: Anthropic;
  pool?: Pick<Pool, 'query'>;
}

export async function askAgent(question: string, deps: AskAgentDeps = {}): Promise<string> {
  const client = deps.client ?? getAnthropicClient();
  const pool = deps.pool ?? getReadOnlyPool();

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: question }];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [searchGamesTool],
      messages,
    });

    if (response.stop_reason !== 'tool_use') {
      return extractText(response);
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'search_games') {
        const rows = await executeSearchGames(block.input, pool);
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(rows) });
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error('A tool-use loop túllépte a maximális iterációszámot.');
}

function extractText(response: Anthropic.Message): string {
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return text || FALLBACK_ANSWER;
}
