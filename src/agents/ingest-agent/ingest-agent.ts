import type Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import { runAgentLoop } from '../agent-loop/agent-loop';
import type { ConversationTurn, ToolDefinition } from '../agent-loop/tool-definition';
import { getReadOnlyPool } from '../../tools/run-sql/read-only-pool';
import { executeRunSql, runSqlTool } from '../../tools/run-sql/run-sql-tool';
import { getWritePool } from '../../tools/upsert-product/write-pool';
import { executeUpsertProduct, upsertProductTool } from '../../tools/upsert-product/upsert-product-tool';
import {
  executeFetchGameDescription,
  fetchGameDescriptionTool,
} from '../../tools/fetch-game-description/fetch-game-description-tool';
import { INGEST_AGENT_SYSTEM_PROMPT } from './ingest-agent-prompt';

export interface IngestAgentDeps {
  client?: Anthropic;
  // Két külön kapcsolat, két külön jogosultsággal — lásd
  // devops/postgres/postgres-init/{01-readonly-role,03-readwrite-role}.sql.
  readPool?: Pick<Pool, 'query'>;
  writePool?: Pick<Pool, 'query'>;
  history?: ConversationTurn[];
  onTextDelta?: (delta: string) => void;
}

export async function ingestAgent(instruction: string, deps: IngestAgentDeps = {}): Promise<string> {
  const readPool = deps.readPool ?? getReadOnlyPool();
  const writePool = deps.writePool ?? getWritePool();

  const tools: ToolDefinition[] = [
    { tool: runSqlTool, execute: (input) => executeRunSql(input, readPool) },
    { tool: upsertProductTool, execute: (input) => executeUpsertProduct(input, writePool) },
    { tool: fetchGameDescriptionTool, execute: (input) => executeFetchGameDescription(input) },
  ];

  return runAgentLoop(
    instruction,
    { systemPrompt: INGEST_AGENT_SYSTEM_PROMPT, tools },
    { client: deps.client, history: deps.history, onTextDelta: deps.onTextDelta },
  );
}
