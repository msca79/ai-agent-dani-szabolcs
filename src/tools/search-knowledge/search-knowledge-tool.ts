import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import type { Pool } from 'pg';
import { embedQuery } from '../../rag/embedding/embed-query';
import { searchKnowledgeInputSchema } from './search-knowledge-input';

const TOP_K = 5;

export const searchKnowledgeTool: Anthropic.Tool = {
  name: 'search_knowledge',
  description:
    'Szemantikus keresés a társasjáték-szabálykönyvek szövegében. Akkor használd, ha a felhasználó egy játék ' +
    'SZABÁLYAIRÓL kérdez (pl. hogyan kell játszani, mi történik egy adott helyzetben, mennyi pontot ér valami) — ' +
    'ár, készlet vagy egyéb katalógus-adat lekérdezésére NEM ez való, arra a run_sql tool.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'A szabállyal kapcsolatos kérdés vagy kulcsszó, amire releváns szövegrészt keresünk.',
      },
    },
    required: ['query'],
  },
};

export interface KnowledgeSearchResult {
  fileName: string;
  startLine: number;
  endLine: number;
  text: string;
}

interface KnowledgeRow {
  file_name: string;
  start_line: number;
  end_line: number;
  chunk_text: string;
}

export async function executeSearchKnowledge(
  rawInput: unknown,
  pool: Pick<Pool, 'query'>,
  openAiClient?: OpenAI,
): Promise<KnowledgeSearchResult[]> {
  const input = searchKnowledgeInputSchema.parse(rawInput);
  const { embedding } = await embedQuery(input.query, openAiClient);

  const result = await pool.query(
    `SELECT file_name, start_line, end_line, chunk_text
     FROM knowledge
     ORDER BY embedding <=> $1
     LIMIT ${TOP_K}`,
    [`[${embedding.join(',')}]`],
  );

  return (result.rows as KnowledgeRow[]).map((row) => ({
    fileName: row.file_name,
    startLine: row.start_line,
    endLine: row.end_line,
    text: row.chunk_text,
  }));
}
