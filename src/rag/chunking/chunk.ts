export interface Chunk {
  fileName: string;
  // 1-alapú, zárt intervallum (mindkét vég beletartozik) az eredeti .txt fájl soraiban.
  startLine: number;
  endLine: number;
  text: string;
}

export interface ChunkingResult {
  chunks: Chunk[];
  tokensUsed: number;
}

export type ChunkingStrategyName = 'fixed-size' | 'llm-semantic';
