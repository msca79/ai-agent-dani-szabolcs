import { describe, expect, it } from 'vitest';
import { chunkFixedSize } from './fixed-size-chunking';

describe('chunkFixedSize', () => {
  it('should return a single chunk covering the whole text when it fits under the target size', () => {
    const text = 'első sor\nmásodik sor\nharmadik sor';

    const result = chunkFixedSize('rovid.txt', text);

    expect(result.tokensUsed).toEqual(0);
    expect(result.chunks).toEqual([{ fileName: 'rovid.txt', startLine: 1, endLine: 3, text }]);
  });

  it('should split a long text into multiple chunks with overlapping lines', () => {
    const lines = Array.from({ length: 200 }, (_, index) => `sor ${index + 1} `.repeat(10));
    const text = lines.join('\n');

    const result = chunkFixedSize('hosszu.txt', text);

    expect(result.chunks.length).toBeGreaterThan(1);
    expect(result.chunks[0]?.startLine).toEqual(1);
    expect(result.chunks.at(-1)?.endLine).toEqual(lines.length);

    // Egymást követő chunkok között legyen átfedés (a második chunk korábban kezdődik, mint ahol az első véget ért).
    for (let i = 1; i < result.chunks.length; i++) {
      expect(result.chunks[i]!.startLine).toBeLessThan(result.chunks[i - 1]!.endLine);
    }
  });

  it('should keep every line covered without gaps across chunk boundaries', () => {
    const lines = Array.from({ length: 120 }, (_, index) => `x`.repeat(50) + index);
    const text = lines.join('\n');

    const result = chunkFixedSize('lefedes.txt', text);

    for (let i = 1; i < result.chunks.length; i++) {
      expect(result.chunks[i]!.startLine).toBeLessThanOrEqual(result.chunks[i - 1]!.endLine + 1);
    }
  });

  it('should not loop forever on a single very long line', () => {
    const text = 'a'.repeat(10000);

    const result = chunkFixedSize('egysor.txt', text);

    expect(result.chunks).toEqual([{ fileName: 'egysor.txt', startLine: 1, endLine: 1, text }]);
  });
});
