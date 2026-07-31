export interface BranchNamingConfig {
  allowedPrefixes: string[];
  separator: string;
  descriptionPattern: string;
}

export interface GitQuackConfig {
  version: 1;
  protectedBranches: string[];
  directPushWarning: boolean;
  branchNamingWarning: boolean;
  branchNaming: BranchNamingConfig;
  detailedExplanations: boolean;
}
