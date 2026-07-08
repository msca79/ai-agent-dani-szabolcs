import { Command } from 'commander';
import type { AskHandler } from './ask-handler';
import { runInteractiveMode } from './interactive-mode';

export function createProgram(handler: AskHandler): Command {
  const program = new Command();

  program
    .name('boardgame')
    .description('Boardgame CLI — társasjáték-ajánló agent')
    .version('0.0.0')
    .action(async () => {
      await runInteractiveMode(handler);
    });

  program
    .command('ask <question>')
    .description('Egyszeri kérdés a boardgame agentnek')
    .action(async (question: string) => {
      const answer = await handler(question);
      console.log(answer);
    });

  return program;
}
