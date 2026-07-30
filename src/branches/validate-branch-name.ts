import type { BranchNamingConfig } from '../config/types.js';
import { suggestBranchNames } from './suggest-branch-names.js';

export type BranchNameValidationReason =
  | 'missing-prefix'
  | 'unsupported-prefix'
  | 'missing-description'
  | 'invalid-description';

export interface BranchNameValidationResult {
  valid: boolean;
  branchName: string;
  reason?: BranchNameValidationReason;
  suggestions: string[];
}

export interface BranchNameValidationOptions {
  protectedBranches: string[];
  branchNaming: BranchNamingConfig;
}

export function validateBranchName(
  branchName: string,
  { protectedBranches, branchNaming }: BranchNameValidationOptions
): BranchNameValidationResult {
  if (protectedBranches.includes(branchName)) {
    return {
      valid: true,
      branchName,
      suggestions: []
    };
  }

  const firstSeparatorIndex = branchName.indexOf(branchNaming.separator);

  if (firstSeparatorIndex === -1) {
    return {
      valid: false,
      branchName,
      reason: 'missing-prefix',
      suggestions: suggestBranchNames(branchName, branchNaming)
    };
  }

  const prefix = branchName.slice(0, firstSeparatorIndex);
  const description = branchName.slice(
    firstSeparatorIndex + branchNaming.separator.length
  );

  if (!branchNaming.allowedPrefixes.includes(prefix)) {
    return {
      valid: false,
      branchName,
      reason: 'unsupported-prefix',
      suggestions: suggestBranchNames(branchName, branchNaming)
    };
  }

  if (description.length === 0) {
    return {
      valid: false,
      branchName,
      reason: 'missing-description',
      suggestions: []
    };
  }

  if (!new RegExp(branchNaming.descriptionPattern).test(description)) {
    return {
      valid: false,
      branchName,
      reason: 'invalid-description',
      suggestions: suggestBranchNames(branchName, branchNaming)
    };
  }

  return {
    valid: true,
    branchName,
    suggestions: []
  };
}
