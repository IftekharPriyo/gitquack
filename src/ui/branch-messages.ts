import { Chalk } from 'chalk';
import type { BranchNameValidationResult } from '../branches/validate-branch-name.js';
import { gitQuackGuardBanner } from './messages.js';

const plain = new Chalk({ level: 0 });
const colors = new Chalk({ level: 1 });

export interface BranchMessageOptions {
  useColor?: boolean;
}

function formatSuggestions(suggestions: string[], chalk: typeof plain): string {
  return suggestions
    .map((suggestion) => `  ${chalk.green(suggestion)}`)
    .join('\n');
}

export function formatBranchNamingGuidance(
  result: BranchNameValidationResult,
  detailedExplanations: boolean,
  options: BranchMessageOptions = {}
): string {
  const color = options.useColor === true;
  const chalk = color ? colors : plain;
  const banner = color
    ? chalk.yellow.bold(gitQuackGuardBanner)
    : gitQuackGuardBanner;
  const alert = color ? chalk.yellow.bold('[!]') : '[!]';
  const branchName = color
    ? chalk.red.bold(`"${result.branchName}"`)
    : `"${result.branchName}"`;
  const primarySuggestion = result.suggestions[0];
  const suggestionBlock =
    result.suggestions.length > 0
      ? formatSuggestions(result.suggestions, chalk)
      : `  ${chalk.green('feature/branch-name')}`;
  const renameTarget = primarySuggestion ?? 'feature/branch-name';
  const renameCommand = chalk.green(`git branch -m ${renameTarget}`);

  if (!detailedExplanations) {
    return `${banner}
${alert} Branch ${branchName} does not match the configured naming convention.

Try:
${suggestionBlock}`;
  }

  return `${banner}
${alert} ${color ? chalk.bold('GitQuack noticed something') : 'GitQuack noticed something'}

The branch name ${branchName} does not match this project's configured convention.

Using a type prefix helps other contributors understand the purpose of a
branch before opening its changes.

Recommended examples:

${suggestionBlock}

You can rename the current branch with:

  ${renameCommand}`;
}

export function formatValidBranchMessage(
  branchName: string,
  options: BranchMessageOptions = {}
): string {
  const chalk = options.useColor === true ? colors : plain;
  return `${chalk.green('[ok]')} Branch ${chalk.green(`"${branchName}"`)} matches the configured convention.`;
}

export const renameSkippedMessage =
  'GitQuack left the current branch name unchanged.';

export function formatRenamedBranchMessage(branchName: string): string {
  return `GitQuack renamed the current branch to "${branchName}".`;
}
