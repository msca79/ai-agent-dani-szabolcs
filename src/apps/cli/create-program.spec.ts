import { describe, expect, it, vi } from 'vitest';
import type { AskHandler } from './ask-handler';
import { createProgram } from './create-program';
import { runInteractiveMode } from './interactive-mode';

vi.mock('./interactive-mode', () => ({
  runInteractiveMode: vi.fn(async () => undefined),
}));

describe('createProgram', () => {
  it('should create a commander program named boardgame', () => {
    const handler: AskHandler = async (question) => question;
    const program = createProgram(handler);

    expect(program.name()).toEqual('boardgame');
  });

  it('should print the handler result for the ask subcommand', async () => {
    const handler: AskHandler = vi.fn(async (question) => `echo:${question}`);
    const program = createProgram(handler);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await program.parseAsync(['ask', 'szia'], { from: 'user' });

    expect(handler).toHaveBeenCalledWith('szia');
    expect(logSpy).toHaveBeenCalledWith('echo:szia');

    logSpy.mockRestore();
  });

  it('should start interactive mode with a handler that forwards to the given handler when no subcommand is given', async () => {
    const handler: AskHandler = vi.fn(async (question) => `echo:${question}`);
    const program = createProgram(handler);

    await program.parseAsync([], { from: 'user' });

    expect(runInteractiveMode).toHaveBeenCalledWith(expect.any(Function));
    const passedHandler = vi.mocked(runInteractiveMode).mock.calls[0][0];

    await expect(passedHandler('szia')).resolves.toEqual('echo:szia');
    expect(handler).toHaveBeenCalledWith('szia');
  });
});
