import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient } from '../client/anthropic-client';
import { logAgentEvent } from './agent-logger';
import type { ConversationTurn, ToolDefinition } from './tool-definition';

const MODEL = process.env['ANTHROPIC_MODEL'] ?? 'claude-sonnet-5';
const MAX_TOKENS = 1024;
const MAX_TOOL_ITERATIONS = 5;
const FALLBACK_ANSWER = 'Erre jelenleg nem tudok válaszolni.';

// Amit egy konkrét agent (query-agent, ingest-agent, ...) ad meg magáról: a
// promptja és a tool-listája. A pool/DB-kapcsolat SZÁNDÉKOSAN nincs itt —
// azt minden tool a saját execute closure-ébe zárva hozza magával, így egy
// agenten belül különböző tool-ok különböző jogosultságú kapcsolatot
// használhatnak (pl. ingest-agent: olvasás read-only, írás read-write pool-lal).
export interface AgentLoopConfig {
  systemPrompt: string;
  tools: ToolDefinition[];
}

export interface AgentDeps {
  client?: Anthropic;
  history?: ConversationTurn[];
  onTextDelta?: (delta: string) => void;
}

export async function runAgentLoop(
  question: string,
  config: AgentLoopConfig,
  deps: AgentDeps = {},
): Promise<string> {
  const client = deps.client ?? getAnthropicClient();
  const history = deps.history ?? [];

  logAgentEvent('agent_start', { question, historyLength: history.length });

  const messages: Anthropic.MessageParam[] = [
    ...history.map((turn): Anthropic.MessageParam => ({ role: turn.role, content: turn.content })),
    { role: 'user', content: question },
  ];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    logAgentEvent('llm_request', {
      iteration,
      model: MODEL,
      systemPrompt: config.systemPrompt,
      tools: config.tools.map((definition) => definition.tool.name),
      messages,
    });

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: config.systemPrompt,
      tools: config.tools.map((definition) => definition.tool),
      messages,
    });

    if (deps.onTextDelta) {
      stream.on('text', (delta) => deps.onTextDelta?.(delta));
    }

    const response = await stream.finalMessage();

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

      const definition = config.tools.find((candidate) => candidate.tool.name === block.name);
      if (!definition) {
        continue;
      }

      logAgentEvent('tool_call', { iteration, tool: block.name, input: block.input });

      const result = await definition.execute(block.input);

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
