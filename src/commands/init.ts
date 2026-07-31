import type { Command } from 'commander';
import { defaultConfig } from '../config/defaults.js';
import { configExists, writeConfig } from '../config/write.js';
import { CliError } from '../errors/cli-error.js';
import { isGitInstalled } from '../git/executable.js';
import { installGitQuackHooks } from '../git/hooks.js';
import { findRepositoryRoot } from '../git/repository.js';

const nonGitRepositoryMessage = `This directory is not inside a Git repository.

Run:

  git init

or move into an existing Git project before running:

  gitquack init`;

const gitUnavailableMessage =
  'Git must be installed before GitQuack can be used. Install Git, then run gitquack init again.';

export interface InitCommandOptions {
  cwd: string;
  writeLine: (message: string) => void;
}

export async function initializeGitQuack({
  cwd,
  writeLine
}: InitCommandOptions): Promise<void> {
  if (!(await isGitInstalled())) {
    throw new CliError(gitUnavailableMessage);
  }

  const repositoryRoot = await findRepositoryRoot(cwd);

  if (repositoryRoot === null) {
    throw new CliError(nonGitRepositoryMessage);
  }

  const alreadyConfigured = await configExists(repositoryRoot);

  try {
    await installGitQuackHooks(repositoryRoot);
  } catch (error) {
    if (error instanceof Error) {
      throw new CliError(error.message);
    }

    throw error;
  }

  if (alreadyConfigured) {
    writeLine('GitQuack is already initialized in this repository.');
    return;
  }

  const configPath = await writeConfig(repositoryRoot, defaultConfig);

  writeLine(`🦆 GitQuack initialized successfully.

Repository:
${repositoryRoot}

Configuration:
${configPath}`);
}

export function registerInitCommand(program: Command): void {
  program
    .command('init')
    .description(
      'Initialize GitQuack configuration in the current Git repository.'
    )
    .action(async () => {
      await initializeGitQuack({
        cwd: process.cwd(),
        writeLine: console.log
      });
    });
}
