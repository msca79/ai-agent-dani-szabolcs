import type { Chunk, ChunkingResult } from './chunk';

const TARGET_CHUNK_CHARS = 1500;
const OVERLAP_LINES = 3;

// Olcsó, LLM-hívás nélküli chunkolás: sorokat gyűjt egy célméretig (karakterben),
// a következő chunk pár sorral korábban kezdődik (átfedés), hogy a chunk-határon
// átnyúló mondatok/szabályok ne vesszenek el a kereséskor.
export function chunkFixedSize(fileName: string, text: string): ChunkingResult {
  const lines = text.split('\n');
  const chunks: Chunk[] = [];

  let startIndex = 0;
  while (startIndex < lines.length) {
    let endIndex = startIndex;
    let charCount = 0;

    while (endIndex < lines.length && (charCount < TARGET_CHUNK_CHARS || endIndex === startIndex)) {
      charCount += lines[endIndex].length + 1;
      endIndex += 1;
    }

    chunks.push({
      fileName,
      startLine: startIndex + 1,
      endLine: endIndex,
      text: lines.slice(startIndex, endIndex).join('\n'),
    });

    if (endIndex >= lines.length) {
      break;
    }

    startIndex = Math.max(endIndex - OVERLAP_LINES, startIndex + 1);
  }

  return { chunks, tokensUsed: 0 };
}
