import { readdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

// Csak azokat a PDF-eket adja vissza, amelyeknek nincs azonos alapnevű .txt
// párja mellettük — így egy korábbi futás már feldolgozott fájljait kihagyja.
export async function findPendingRulebookPdfs(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const fileNames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);

  const pdfNames = fileNames.filter((name) => extname(name).toLowerCase() === '.pdf');
  const txtBaseNames = new Set(
    fileNames
      .filter((name) => extname(name).toLowerCase() === '.txt')
      .map((name) => basename(name, extname(name))),
  );

  return pdfNames
    .filter((name) => !txtBaseNames.has(basename(name, extname(name))))
    .sort()
    .map((name) => join(dir, name));
}
