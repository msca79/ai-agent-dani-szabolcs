import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findPendingRulebookPdfs } from './find-pending-pdfs';

describe('findPendingRulebookPdfs', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'rule-book-converter-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('should return a pdf that has no matching txt file', async () => {
    await writeFile(join(dir, 'catan.pdf'), '');

    const result = await findPendingRulebookPdfs(dir);

    expect(result).toEqual([join(dir, 'catan.pdf')]);
  });

  it('should skip a pdf that already has a matching txt file', async () => {
    await writeFile(join(dir, 'catan.pdf'), '');
    await writeFile(join(dir, 'catan.txt'), 'már feldolgozva');

    const result = await findPendingRulebookPdfs(dir);

    expect(result).toEqual([]);
  });

  it('should ignore non-pdf files and unrelated txt files', async () => {
    await writeFile(join(dir, 'dobble.pdf'), '');
    await writeFile(join(dir, 'notes.txt'), 'nem tartozik egy pdf-hez sem');
    await writeFile(join(dir, 'readme.md'), '');

    const result = await findPendingRulebookPdfs(dir);

    expect(result).toEqual([join(dir, 'dobble.pdf')]);
  });

  it('should match extensions case-insensitively', async () => {
    await writeFile(join(dir, 'azul.PDF'), '');
    await writeFile(join(dir, 'azul.TXT'), 'már feldolgozva');

    const result = await findPendingRulebookPdfs(dir);

    expect(result).toEqual([]);
  });

  it('should return an empty array for a directory with no pdfs', async () => {
    await writeFile(join(dir, 'notes.txt'), '');

    const result = await findPendingRulebookPdfs(dir);

    expect(result).toEqual([]);
  });
});
