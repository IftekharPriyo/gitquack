export function formatProtectedBranchWarning(
  branches: string[],
  detailedExplanations: boolean
): string {
  const branchList = branches.map((branch) => `"${branch}"`).join(', ');
  const branchWord = branches.length === 1 ? 'branch' : 'branches';

  if (!detailedExplanations) {
    return `🦆 Direct push to protected ${branchWord} ${branchList}.

Continue? [y/N] `;
  }

  return `🦆 GitQuack noticed something

You are about to push directly to protected ${branchWord} ${branchList}.

In collaborative projects, changes are commonly pushed through a separate
working branch and reviewed before being merged.

A common workflow is:

  git switch -c feature/short-description
  git push -u origin feature/short-description

Continue pushing directly to ${branchList}? [y/N] `;
}

export const nonInteractiveProtectedPushMessage = `GitQuack detected a direct push to a protected branch, but confirmation
cannot be requested in this environment.

The push was cancelled. Your local commits and files remain unchanged.`;
