import type { PushRefUpdate } from './parse-pre-push.js';

const zeroObjectIdPattern = /^0+$/;
const branchPrefix = 'refs/heads/';

export function branchNameFromRemoteRef(remoteRef: string): string | null {
  if (!remoteRef.startsWith(branchPrefix)) {
    return null;
  }

  return remoteRef.slice(branchPrefix.length);
}

export function isDeletionRef(update: PushRefUpdate): boolean {
  return zeroObjectIdPattern.test(update.localObjectId);
}

export function findProtectedPushBranches(
  updates: PushRefUpdate[],
  protectedBranches: string[]
): string[] {
  const protectedBranchSet = new Set(protectedBranches);
  const affectedBranches = new Set<string>();

  for (const update of updates) {
    if (isDeletionRef(update)) {
      continue;
    }

    const branchName = branchNameFromRemoteRef(update.remoteRef);

    if (branchName !== null && protectedBranchSet.has(branchName)) {
      affectedBranches.add(branchName);
    }
  }

  return [...affectedBranches];
}
