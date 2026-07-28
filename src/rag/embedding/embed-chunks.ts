import type OpenAI from 'openai';
import type { Chunk } from '../chunking/chunk';
import { EMBEDDING_MODEL } from './embedding-model';
import { getOpenAiClient } from './openai-client';

export interface EmbeddedChunk {
  chunk: Chunk;
  embedding: number[];
}

export interface EmbeddingResult {
  embeddedChunks: EmbeddedChunk[];
  tokensUsed: number;
}

export async function embedChunks(chunks: Chunk[], client: OpenAI = getOpenAiClient()): Promise<EmbeddingResult> {
  if (chunks.length === 0) {
    return { embeddedChunks: [], tokensUsed: 0 };
  }

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: chunks.map((chunk) => chunk.text),
  });

  const embeddedChunks: EmbeddedChunk[] = response.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((item, position) => ({ chunk: chunks[position], embedding: item.embedding }));

  return { embeddedChunks, tokensUsed: response.usage.total_tokens };
}
