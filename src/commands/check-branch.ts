import { stdout } from 'node:process';
import type { Command } from 'commander';
import { validateBranchName } from '../branches/validate-branch-name.js';
import { readConfig } from '../config/read.js';
import { CliError } from '../errors/cli-error.js';
import { getCurrentBranch } from '../git/branch.js';
import { findRepositoryRoot } from '../git/repository.js';
import {
  formatBranchNamingGuidance,
  formatValidBranchMessage
} from '../ui/branch-messages.js';
import { shouldUseColor } from '../ui/terminal.js';

export interface CheckBranchOptions {
  cwd: string;
  writeLine: (message: string) => void;
}

export async function checkCurrentBranch({
  cwd,
  writeLine
}: CheckBranchOptions): Promise<void> {
  const repositoryRoot = await findRepositoryRoot(cwd);

  if (repositoryRoot === null) {
    throw new CliError('This directory is not inside a Git repository.');
  }

  const branchName = await getCurrentBranch(repositoryRoot);

  if (branchName === null) {
    writeLine(
      'GitQuack skipped branch-name validation in detached HEAD state.'
    );
    return;
  }

  const config = await readConfig(repositoryRoot);

  if (!config.branchNamingWarning) {
    writeLine('GitQuack branch-name guidance is disabled for this repository.');
    return;
  }

  const result = validateBranchName(branchName, {
    protectedBranches: config.protectedBranches,
    branchNaming: config.branchNaming
  });

  if (result.valid) {
    writeLine(
      formatValidBranchMessage(branchName, {
        useColor: shouldUseColor(stdout)
      })
    );
    return;
  }

  writeLine(
    formatBranchNamingGuidance(result, config.detailedExplanations, {
      useColor: shouldUseColor(stdout)
    })
  );
}

export function registerCheckBranchCommand(program: Command): void {
  program
    .command('check-branch')
    .description('Check the current branch name against GitQuack conventions.')
    .action(async () => {
      await checkCurrentBranch({
        cwd: process.cwd(),
        writeLine: console.log
      });
    });
}
