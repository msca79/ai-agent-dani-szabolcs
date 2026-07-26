import { createInterface } from 'node:readline/promises';
import type { AskHandler } from './ask-handler';

export async function runInteractiveMode(
  handler: AskHandler,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<void> {
  const rl = createInterface({ input, output });

  for await (const line of rl) {
    if (line === 'exit') {
      break;
    }

    const answer = await handler(line);
    output.write(`${answer}\n`);
  }

  rl.close();
}
