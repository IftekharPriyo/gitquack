import type { BranchNamingConfig } from '../config/types.js';
import { normalizeBranchDescription } from './normalize-branch-description.js';

export function suggestBranchNames(
  branchName: string,
  config: BranchNamingConfig
): string[] {
  const [prefix, ...descriptionParts] = branchName.split(config.separator);
  const rawDescription =
    prefix !== undefined && descriptionParts.length > 0
      ? descriptionParts.join(config.separator)
      : branchName;
  const description = normalizeBranchDescription(rawDescription);

  if (description.length === 0) {
    return [];
  }

  return config.allowedPrefixes
    .slice(0, 3)
    .map(
      (allowedPrefix) => `${allowedPrefix}${config.separator}${description}`
    );
}
