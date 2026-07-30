import { Chalk } from 'chalk';

const plain = new Chalk({ level: 0 });
const colors = new Chalk({ level: 1 });

export const gitQuackGuardBanner = String.raw`
    __
 __( 0)<
 \___)
  " "   GITQUACK GUARD
`;

export interface ProtectedBranchWarningOptions {
  useColor?: boolean;
}

export function formatProtectedBranchWarning(
  branches: string[],
  detailedExplanations: boolean,
  options: ProtectedBranchWarningOptions = {}
): string {
  const color = options.useColor === true;
  const branchList = branches.map((branch) => `"${branch}"`).join(', ');
  const branchWord = branches.length === 1 ? 'branch' : 'branches';
  const branchLabel =
    branches.length === 1 ? 'Protected branch' : 'Protected branches';
  const chalk = color ? colors : plain;
  const banner = color
    ? chalk.yellow.bold(gitQuackGuardBanner)
    : gitQuackGuardBanner;
  const alert = color ? chalk.yellow.bold('[!]') : '[!]';
  const decoratedBranchList = color
    ? branches.map((branch) => chalk.red.bold(`"${branch}"`)).join(', ')
    : branchList;
  const decoratedBranchLabel = color
    ? chalk.red.bold(branchLabel)
    : branchLabel;
  const suggestedCommand = (command: string): string =>
    color ? chalk.green(command) : command;
  const prompt = color
    ? chalk.cyan(`Continue pushing directly to ${decoratedBranchList}? [y/N] `)
    : `Continue pushing directly to ${branchList}? [y/N] `;
  const shortPrompt = color
    ? chalk.cyan('Continue? [y/N] ')
    : 'Continue? [y/N] ';

  if (!detailedExplanations) {
    return `${banner}
${alert} Direct push to protected ${branchWord} ${decoratedBranchList}.

${shortPrompt}`;
  }

  return `${banner}
${alert} ${color ? chalk.bold('GitQuack noticed a protected branch push') : 'GitQuack noticed a protected branch push'}

${decoratedBranchLabel}: ${decoratedBranchList}

You are about to push directly to protected ${branchWord} ${decoratedBranchList}.

In collaborative projects, changes are commonly pushed through a separate
working branch and reviewed before being merged.

A common workflow is:

  ${suggestedCommand('git switch -c feature/feature-name')}
  ${suggestedCommand('git push -u origin feature/feature-name')}

${prompt}`;
}

export const nonInteractiveProtectedPushMessage = `GitQuack detected a direct push to a protected branch, but confirmation
cannot be requested in this environment.

The push was cancelled. Your local commits and files remain unchanged.`;
