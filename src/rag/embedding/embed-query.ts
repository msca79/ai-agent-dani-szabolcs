import type OpenAI from 'openai';
import { EMBEDDING_MODEL } from './embedding-model';
import { getOpenAiClient } from './openai-client';

export interface EmbedQueryResult {
  embedding: number[];
  tokensUsed: number;
}

export async function embedQuery(query: string, client: OpenAI = getOpenAiClient()): Promise<EmbedQueryResult> {
  const response = await client.embeddings.create({ model: EMBEDDING_MODEL, input: query });

  const [embedding] = response.data;
  if (!embedding) {
    throw new Error('Nem érkezett embedding a kérdésre.');
  }

  return { embedding: embedding.embedding, tokensUsed: response.usage.total_tokens };
}
