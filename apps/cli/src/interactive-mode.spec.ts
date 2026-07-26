import { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import type { AskHandler } from './ask-handler';
import { runInteractiveMode } from './interactive-mode';

function collectOutput(): { output: Writable; getText: () => string } {
  const chunks: string[] = [];
  const output = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });

  return { output, getText: () => chunks.join('') };
}

describe('runInteractiveMode', () => {
  it('should call the handler for every non-exit line and print the result', async () => {
    const input = Readable.from(['szia\n', 'exit\n']);
    const { output, getText } = collectOutput();
    const handler: AskHandler = vi.fn(async (question) => `echo:${question}`);

    await runInteractiveMode(handler, input, output);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('szia');
    expect(getText()).toContain('echo:szia');
  });

  it('should stop the loop after an exit line without calling the handler for it', async () => {
    const input = Readable.from(['exit\n', 'ez már ne fusson\n']);
    const { output } = collectOutput();
    const handler: AskHandler = vi.fn(async (question) => question);

    await runInteractiveMode(handler, input, output);

    expect(handler).not.toHaveBeenCalled();
  });
});
