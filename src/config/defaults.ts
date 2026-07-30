import type { GitQuackConfig } from './types.js';

export const defaultConfig: GitQuackConfig = {
  version: 1,
  protectedBranches: ['main', 'master', 'develop'],
  directPushWarning: true,
  branchNamingWarning: true,
  detailedExplanations: true
};
