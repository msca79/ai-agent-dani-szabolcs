import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type Anthropic from '@anthropic-ai/sdk';
import type OpenAI from 'openai';
import type { Pool } from 'pg';
import type { ChunkingResult, ChunkingStrategyName } from '../chunking/chunk';
import { chunkFixedSize } from '../chunking/fixed-size-chunking';
import { chunkLlmSemantic } from '../chunking/llm-semantic-chunking';
import { embedChunks } from '../embedding/embed-chunks';
import { getRagPool } from '../rag-pool';

// Itt állítható át, melyik chunkolási stratégia fusson.
const CHUNK_STRATEGY: ChunkingStrategyName = 'fixed-size';

export interface LoadKnowledgeDeps {
  pool?: Pick<Pool, 'query'>;
  anthropicClient?: Anthropic;
  openAiClient?: OpenAI;
}

export interface LoadKnowledgeSummary {
  filesProcessed: number;
  filesFailed: number;
  totalChunks: number;
  totalChunkingTokens: number;
  totalEmbeddingTokens: number;
}

export async function loadKnowledge(rulebooksDir: string, deps: LoadKnowledgeDeps = {}): Promise<LoadKnowledgeSummary> {
  const pool = deps.pool ?? getRagPool();

  await pool.query('DELETE FROM knowledge');

  const fileNames = (await readdir(rulebooksDir)).filter((name) => name.toLowerCase().endsWith('.txt'));

  const summary: LoadKnowledgeSummary = {
    filesProcessed: 0,
    filesFailed: 0,
    totalChunks: 0,
    totalChunkingTokens: 0,
    totalEmbeddingTokens: 0,
  };

  for (const fileName of fileNames) {
    try {
      const text = await readFile(join(rulebooksDir, fileName), 'utf-8');

      const chunkingResult: ChunkingResult =
        CHUNK_STRATEGY === 'fixed-size'
          ? chunkFixedSize(fileName, text)
          : await chunkLlmSemantic(fileName, text, deps.anthropicClient);

      const { embeddedChunks, tokensUsed: embeddingTokens } = await embedChunks(
        chunkingResult.chunks,
        deps.openAiClient,
      );

      for (const { chunk, embedding } of embeddedChunks) {
        await pool.query(
          `INSERT INTO knowledge (file_name, start_line, end_line, chunk_text, chunking_strategy, embedding)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [chunk.fileName, chunk.startLine, chunk.endLine, chunk.text, CHUNK_STRATEGY, `[${embedding.join(',')}]`],
        );
      }

      console.log(
        `${fileName}: ${chunkingResult.chunks.length} chunk, ~${chunkingResult.tokensUsed} token (chunking), ` +
          `~${embeddingTokens} token (embedding)`,
      );

      summary.filesProcessed += 1;
      summary.totalChunks += chunkingResult.chunks.length;
      summary.totalChunkingTokens += chunkingResult.tokensUsed;
      summary.totalEmbeddingTokens += embeddingTokens;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ✖ hiba (${fileName}): ${message}`);
      summary.filesFailed += 1;
    }
  }

  return summary;
}
