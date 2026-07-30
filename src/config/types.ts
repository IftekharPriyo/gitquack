export interface GitQuackConfig {
  version: 1;
  protectedBranches: string[];
  directPushWarning: boolean;
  branchNamingWarning: boolean;
  detailedExplanations: boolean;
}
