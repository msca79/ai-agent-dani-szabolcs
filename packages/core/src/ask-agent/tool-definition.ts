import type Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';

export interface ToolDefinition {
  tool: Anthropic.Tool;
  execute: (rawInput: unknown, pool: Pick<Pool, 'query'>) => Promise<unknown>;
}
