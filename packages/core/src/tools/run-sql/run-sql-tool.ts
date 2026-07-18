import type Anthropic from '@anthropic-ai/sdk';
import type { Pool } from 'pg';
import type { ToolDefinition } from '../tool-definition';
import { assertReadOnlySelect } from './run-sql-guard';
import { runSqlInputSchema } from './run-sql-input';

const MAX_ROWS = 100;

export const runSqlTool: Anthropic.Tool = {
  name: 'run_sql',
  description:
    'Tetszőleges, csak olvasó SQL lekérdezés futtatása a games sémán, ha a search_games szűrői nem elegendőek. ' +
    'Csak egyetlen SELECT (vagy WITH ... SELECT) utasítás engedélyezett, adatmódosító utasítás nem futtatható.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Egyetlen SELECT (vagy WITH ... SELECT) SQL utasítás.' },
    },
    required: ['query'],
  },
};

export async function executeRunSql(rawInput: unknown, pool: Pick<Pool, 'query'>): Promise<unknown[]> {
  const input = runSqlInputSchema.parse(rawInput);
  const safeQuery = assertReadOnlySelect(input.query);
  const result = await pool.query(`SELECT * FROM (${safeQuery}) AS run_sql_subquery LIMIT ${MAX_ROWS}`);

  return result.rows;
}

export const runSqlToolDefinition: ToolDefinition = {
  tool: runSqlTool,
  execute: executeRunSql,
};