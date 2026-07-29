import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import type { Pool } from 'pg';
import { logAgentEvent } from '../../agents/agent-loop/agent-logger';
import { embedQuery } from '../../rag/embedding/embed-query';
import { generateHypotheticalDocument, HYDE_ENABLED } from './hyde';
import type { KnowledgeSearchResult } from './knowledge-search-result';
import { CANDIDATE_POOL_SIZE, RERANK_ENABLED, rerankChunks } from './rerank';
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

export type { KnowledgeSearchResult } from './knowledge-search-result';

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
  anthropicClient?: Anthropic,
): Promise<KnowledgeSearchResult[]> {
  const input = searchKnowledgeInputSchema.parse(rawInput);

  // 1. réteg (opcionális): HyDE — a nyers kérdés helyett egy erre írt
  // hipotetikus szabálykönyv-részletet embedelünk, mert az stílusban jobban
  // hasonlít a tárolt chunk-okhoz, mint egy rövid kérdés.
  let textToEmbed = input.query;
  if (HYDE_ENABLED) {
    const hyde = await generateHypotheticalDocument(input.query, anthropicClient);
    logAgentEvent('rag_hyde', { tokensUsed: hyde.tokensUsed });
    textToEmbed = hyde.hypotheticalDocument;
  }

  const { embedding } = await embedQuery(textToEmbed, openAiClient);

  // 2. réteg (opcionális): rerank — ha be van kapcsolva, szélesebb
  // jelölt-halmazt kérünk le, amit egy LLM rendez/szűkít a végleges top-K-ra.
  const poolSize = RERANK_ENABLED ? CANDIDATE_POOL_SIZE : TOP_K;
  const result = await pool.query(
    `SELECT file_name, start_line, end_line, chunk_text
     FROM knowledge
     ORDER BY embedding <=> $1
     LIMIT ${poolSize}`,
    [`[${embedding.join(',')}]`],
  );

  const candidates: KnowledgeSearchResult[] = (result.rows as KnowledgeRow[]).map((row) => ({
    fileName: row.file_name,
    startLine: row.start_line,
    endLine: row.end_line,
    text: row.chunk_text,
  }));

  if (!RERANK_ENABLED) {
    return candidates;
  }

  const reranked = await rerankChunks(input.query, candidates, TOP_K, anthropicClient);
  const chunkId = (chunk: KnowledgeSearchResult): string => `${chunk.fileName}:${chunk.startLine}-${chunk.endLine}`;
  logAgentEvent('rag_rerank', {
    tokensUsed: reranked.tokensUsed,
    // A vektor-keresés eredeti sorrendje vs. a rerank utáni sorrend — ugyanazon
    // azonosítókkal, hogy az átrendeződés (vagy annak hiánya) közvetlenül
    // összevethető legyen a logból, LLM-hívás nélkül.
    candidateOrder: candidates.map(chunkId),
    rerankedOrder: reranked.chunks.map(chunkId),
  });

  return reranked.chunks;
}
