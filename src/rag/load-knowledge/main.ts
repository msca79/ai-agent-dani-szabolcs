import { resolve } from 'node:path';
import { config } from 'dotenv';
import { getAnthropicClient } from '../../agents/client/anthropic-client';
import { getOpenAiClient } from '../embedding/openai-client';
import { getRagPool } from '../rag-pool';
import { loadKnowledge } from './load-knowledge';

config({ path: resolve(__dirname, '../../../.env') });

async function main(): Promise<void> {
  const anthropicClient = getAnthropicClient();
  const openAiClient = getOpenAiClient();
  const pool = getRagPool();
  const rulebooksDir = resolve(__dirname, '../../../rulebooks');

  const summary = await loadKnowledge(rulebooksDir, { pool, anthropicClient, openAiClient });

  console.log(
    `Kész: ${summary.filesProcessed} sikeres, ${summary.filesFailed} hibás, ${summary.totalChunks} chunk összesen, ` +
      `~${summary.totalChunkingTokens} token (chunking), ~${summary.totalEmbeddingTokens} token (embedding).`,
  );
  process.exitCode = summary.filesFailed > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
