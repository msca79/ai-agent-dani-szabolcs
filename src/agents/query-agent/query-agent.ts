import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import type { Pool } from 'pg';
import { runAgentLoop } from '../agent-loop/agent-loop';
import type { ConversationTurn, ToolDefinition } from '../agent-loop/tool-definition';
import { getReadOnlyPool } from '../../tools/run-sql/read-only-pool';
import { executeRunSql, runSqlTool } from '../../tools/run-sql/run-sql-tool';
import { executeSearchKnowledge, searchKnowledgeTool } from '../../tools/search-knowledge/search-knowledge-tool';
import { QUERY_AGENT_SYSTEM_PROMPT } from './query-agent-prompt';

export interface QueryAgentDeps {
  client?: Anthropic;
  pool?: Pick<Pool, 'query'>;
  // A search_knowledge tool embedeléséhez — külön kliens, mert az OpenAI-t
  // hívja, nem a Claude API-t.
  openAiClient?: OpenAI;
  // Korábbi kérdés/válasz párok — a hívó (cli, web) tartja számon, a
  // queryAgent csak beleveszi ebből az adott hívás kontextusába, saját maga
  // nem őrzi meg.
  history?: ConversationTurn[];
  // Ha adott, minden szöveg-deltát megkap streamelve, amint az LLM-től megérkezik.
  onTextDelta?: (delta: string) => void;
}

export async function queryAgent(question: string, deps: QueryAgentDeps = {}): Promise<string> {
  const pool = deps.pool ?? getReadOnlyPool();

  // Új tool bekötése: egy sor ebben a listában, dispatch-et nem kell máshol karbantartani.
  const tools: ToolDefinition[] = [
    { tool: runSqlTool, execute: (input) => executeRunSql(input, pool) },
    { tool: searchKnowledgeTool, execute: (input) => executeSearchKnowledge(input, pool, deps.openAiClient) },
  ];

  return runAgentLoop(
    question,
    { systemPrompt: QUERY_AGENT_SYSTEM_PROMPT, tools },
    { client: deps.client, history: deps.history, onTextDelta: deps.onTextDelta },
  );
}

export type { ConversationTurn } from '../agent-loop/tool-definition';
