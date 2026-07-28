import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { config } from 'dotenv';
import { getAnthropicClient } from '../../agents/client/anthropic-client';
import { findPendingRulebookPdfs } from './find-pending-pdfs';
import { convertRulebookPdf } from './convert-rulebook';

config({ path: resolve(__dirname, '../../../.env') });

async function main(): Promise<void> {
  const dirArg = process.argv[2];

  if (!dirArg) {
    console.error('Használat: npm run convert-rulebooks -- <mappa>');
    process.exitCode = 1;
    return;
  }

  const client = getAnthropicClient();
  const dir = resolve(dirArg);
  const pdfPaths = await findPendingRulebookPdfs(dir);

  if (pdfPaths.length === 0) {
    console.log('Nincs feldolgozandó PDF (mindegyikhez van már .txt párja).');
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (const pdfPath of pdfPaths) {
    const txtPath = pdfPath.replace(/\.pdf$/i, '.txt');
    console.log(`Feldolgozás: ${pdfPath}`);

    try {
      const text = await convertRulebookPdf(pdfPath, client);
      await writeFile(txtPath, text, 'utf-8');
      console.log(`  ✓ mentve: ${txtPath}`);
      succeeded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  ✖ hiba (${pdfPath}): ${message}`);
      failed += 1;
    }
  }

  console.log(`Kész: ${succeeded} sikeres, ${failed} hibás.`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
