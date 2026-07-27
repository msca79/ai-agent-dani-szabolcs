import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '../client/anthropic-client';
import { getReadOnlyPool } from '../../tools/run-sql/read-only-pool';
import { executeRunSql, runSqlTool } from '../../tools/run-sql/run-sql-tool';
import { BOARDGAME_SYSTEM_PROMPT } from '../system-prompts/boardgame-system-prompt';
import type { Pool } from 'pg';
import { logAgentEvent } from './agent-logger';
import type { ToolDefinition } from './tool-definition';

const MODEL = process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-5';
const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 5;
const FALLBACK_ANSWER = 'Erre jelenleg nem tudok válaszolni.';

const runSqlToolDefinition: ToolDefinition = { tool: runSqlTool, execute: executeRunSql };

// Új tool bekötése: egy sor ebben a listában, dispatch-et nem kell máshol karbantartani.
const TOOL_DEFINITIONS: ToolDefinition[] = [runSqlToolDefinition];

export interface AskAgentDeps {
  client?: Anthropic;
  pool?: Pick<Pool, 'query'>;
}

export async function askAgent(question: string, deps: AskAgentDeps = {}): Promise<string> {
  const client = deps.client ?? getAnthropicClient();
  const pool = deps.pool ?? getReadOnlyPool();

  logAgentEvent('agent_start', { question });

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: question }];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    logAgentEvent('llm_request', {
      iteration,
      model: MODEL,
      systemPrompt: BOARDGAME_SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS.map((definition) => definition.tool.name),
      messages,
    });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: BOARDGAME_SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS.map((definition) => definition.tool),
      messages,
    });

    logAgentEvent('llm_response', {
      iteration,
      stopReason: response.stop_reason,
      content: response.content,
    });

    if (response.stop_reason !== 'tool_use') {
      const answer = extractText(response);
      logAgentEvent('agent_end', { answerLength: answer.length });
      return answer;
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== 'tool_use') {
        continue;
      }

      const definition = TOOL_DEFINITIONS.find((candidate) => candidate.tool.name === block.name);
      if (!definition) {
        continue;
      }

      logAgentEvent('tool_call', { iteration, tool: block.name, input: block.input });

      const result = await definition.execute(block.input, pool);

      logAgentEvent('tool_result', {
        iteration,
        tool: block.name,
        resultCount: Array.isArray(result) ? result.length : undefined,
      });

      toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  logAgentEvent('agent_error', { message: 'max_tool_iterations_exceeded' });
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
