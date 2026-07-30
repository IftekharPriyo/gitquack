import type { Command } from 'commander';

export const helloMessage = '🦆 GitQuack is ready.';

export function registerHelloCommand(program: Command): void {
  program
    .command('hello')
    .description('Confirm the GitQuack CLI is installed.')
    .action(() => {
      console.log(helloMessage);
    });
}
