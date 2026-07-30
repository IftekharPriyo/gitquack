import type { GitQuackConfig } from './types.js';

export const defaultConfig: GitQuackConfig = {
  version: 1,
  protectedBranches: ['main', 'master', 'develop'],
  directPushWarning: true,
  branchNamingWarning: true,
  branchNaming: {
    allowedPrefixes: [
      'feature',
      'feat',
      'fix',
      'hotfix',
      'docs',
      'refactor',
      'test',
      'chore'
    ],
    separator: '/',
    descriptionPattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  },
  detailedExplanations: true
};
