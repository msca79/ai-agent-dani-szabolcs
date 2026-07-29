import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { getAnthropicClient } from '../../agents/client/anthropic-client';
import { RAG_LLM_MODEL } from '../../rag/rag-llm-model';
import type { KnowledgeSearchResult } from './knowledge-search-result';

// Ha be van kapcsolva, a vektor-keresés CANDIDATE_POOL_SIZE jelöltet hoz
// vissza (a végleges top-K helyett), és egy LLM válogatja/rendezi ki közülük
// a legjobb top-K-t az EREDETI kérdéshez képest (nem a HyDE-dokumentumhoz).
// Env-változóval felülírható (RERANK_ENABLED=false), hogy a golden set-et
// nyers keresés vs. teljes pipeline összehasonlításban lehessen futtatni
// kódmódosítás nélkül.
export const RERANK_ENABLED = process.env['RERANK_ENABLED'] !== 'false';
export const CANDIDATE_POOL_SIZE = 15;

const MAX_TOKENS = 1024;

const rankingSchema = z.object({
  rankedIndices: z
    .array(z.number().int().min(0))
    .min(1)
    .describe('A jelöltek indexei relevancia szerint csökkenő sorrendben, a legrelevánsabbal kezdve.'),
});

const SYSTEM_PROMPT = `<role>
Társasjáték-szabálykönyv szövegrészleteket (chunk) rangsorolsz egy adott
kérdéshez képest relevancia szerint.
</role>

<rules>
- Minden jelölt egy [index] sorszámmal van ellátva.
- Add vissza az indexeket relevancia szerint csökkenő sorrendben — a kérdést
  legjobban megválaszoló, legrelevánsabb jelölttel kezdve.
- Csak azokat az indexeket add vissza, amelyek ténylegesen kapcsolódnak a
  kérdéshez; a teljesen irreleváns jelölteket hagyd ki.
</rules>`;

export interface RerankResult {
  chunks: KnowledgeSearchResult[];
  tokensUsed: number;
}

export async function rerankChunks(
  query: string,
  candidates: KnowledgeSearchResult[],
  topK: number,
  client: Anthropic = getAnthropicClient(),
): Promise<RerankResult> {
  if (candidates.length === 0) {
    return { chunks: [], tokensUsed: 0 };
  }

  const candidateList = candidates
    .map(
      (candidate, index) =>
        `[${index}] (${candidate.fileName}, ${candidate.startLine}-${candidate.endLine}):\n${candidate.text}`,
    )
    .join('\n\n');

  const response = await client.messages.parse({
    model: RAG_LLM_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Kérdés: ${query}\n\nJelöltek:\n${candidateList}` }],
    output_config: { format: zodOutputFormat(rankingSchema) },
  });

  const tokensUsed = (response.usage.input_tokens ?? 0) + response.usage.output_tokens;

  if (!response.parsed_output) {
    return { chunks: candidates.slice(0, topK), tokensUsed };
  }

  const chunks = response.parsed_output.rankedIndices
    .filter((index) => index >= 0 && index < candidates.length)
    .slice(0, topK)
    .map((index) => candidates[index]!);

  return { chunks, tokensUsed };
}
