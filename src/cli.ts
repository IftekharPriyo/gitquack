#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { registerHelloCommand } from './commands/hello.js';
import { registerInitCommand } from './commands/init.js';
import { isCliError } from './errors/cli-error.js';

export function createCli(): Command {
  const program = new Command();

  program
    .name('gitquack')
    .description('A local Git learning assistant for students.')
    .version('0.1.0')
    .showHelpAfterError(chalk.dim('(add --help for additional information)'));

  registerHelloCommand(program);
  registerInitCommand(program);

  return program;
}

try {
  await createCli().parseAsync(process.argv);
} catch (error) {
  if (isCliError(error)) {
    console.error(error.message);
    process.exitCode = error.exitCode;
  } else {
    throw error;
  }
}
