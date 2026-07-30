#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { registerHelloCommand } from './commands/hello.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('gitquack')
    .description('A local Git learning assistant for students.')
    .version('0.1.0')
    .showHelpAfterError(chalk.dim('(add --help for additional information)'));

  registerHelloCommand(program);

  return program;
}

await createCli().parseAsync(process.argv);
