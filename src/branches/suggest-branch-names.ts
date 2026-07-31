import type { BranchNamingConfig } from '../config/types.js';
import { normalizeBranchDescription } from './normalize-branch-description.js';

interface PrefixKeywordRule {
  prefix: string;
  keywords: string[];
}

const prefixKeywordRules: PrefixKeywordRule[] = [
  {
    prefix: 'fix',
    keywords: [
      'bug',
      'bugs',
      'broken',
      'crash',
      'error',
      'errors',
      'fail',
      'failure',
      'fix',
      'issue',
      'issues'
    ]
  },
  {
    prefix: 'hotfix',
    keywords: ['hotfix', 'patch', 'urgent']
  },
  {
    prefix: 'docs',
    keywords: ['doc', 'docs', 'guide', 'readme', 'setup', 'instructions']
  },
  {
    prefix: 'refactor',
    keywords: ['cleanup', 'refactor', 'rename', 'restructure']
  },
  {
    prefix: 'test',
    keywords: ['spec', 'specs', 'test', 'tests']
  },
  {
    prefix: 'chore',
    keywords: [
      'build',
      'chore',
      'ci',
      'config',
      'dependencies',
      'dependency',
      'deps',
      'tooling',
      'update',
      'upgrade'
    ]
  }
];

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

  return rankAllowedPrefixes({
    allowedPrefixes: config.allowedPrefixes,
    currentPrefix: prefix,
    description
  })
    .slice(0, 3)
    .map(
      (allowedPrefix) => `${allowedPrefix}${config.separator}${description}`
    );
}

interface RankAllowedPrefixesOptions {
  allowedPrefixes: string[];
  currentPrefix?: string;
  description: string;
}

function rankAllowedPrefixes({
  allowedPrefixes,
  currentPrefix,
  description
}: RankAllowedPrefixesOptions): string[] {
  const words = description.split('-').filter((word) => word.length > 0);

  return allowedPrefixes
    .map((prefix, index) => ({
      index,
      prefix,
      score:
        getCurrentPrefixScore(prefix, currentPrefix, allowedPrefixes) +
        getKeywordScore(prefix, words)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ prefix }) => prefix);
}

function getCurrentPrefixScore(
  prefix: string,
  currentPrefix: string | undefined,
  allowedPrefixes: string[]
): number {
  if (
    currentPrefix !== undefined &&
    allowedPrefixes.includes(currentPrefix) &&
    prefix === currentPrefix
  ) {
    return 100;
  }

  return 0;
}

function getKeywordScore(prefix: string, words: string[]): number {
  const rule = prefixKeywordRules.find((item) => item.prefix === prefix);

  if (rule === undefined) {
    return 0;
  }

  return rule.keywords.some((keyword) => words.includes(keyword)) ? 10 : 0;
}
