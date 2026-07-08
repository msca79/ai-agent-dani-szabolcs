import { Command } from 'commander';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('boardgame')
    .description('Boardgame CLI — társasjáték-ajánló agent')
    .version('0.0.0')
    .action(() => {
      console.log('boardgame CLI — scaffold ready, no commands implemented yet');
    });

  return program;
}
