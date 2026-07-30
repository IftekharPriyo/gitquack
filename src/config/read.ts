import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { configFileName } from './write.js';
import type { GitQuackConfig } from './types.js';

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isGitQuackConfig(value: unknown): value is GitQuackConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === 1 &&
    'protectedBranches' in value &&
    isStringArray(value.protectedBranches) &&
    'directPushWarning' in value &&
    typeof value.directPushWarning === 'boolean' &&
    'branchNamingWarning' in value &&
    typeof value.branchNamingWarning === 'boolean' &&
    'detailedExplanations' in value &&
    typeof value.detailedExplanations === 'boolean'
  );
}

export async function readConfig(
  repositoryRoot: string
): Promise<GitQuackConfig> {
  const rawConfig = await readFile(
    join(repositoryRoot, configFileName),
    'utf8'
  );
  const parsedConfig: unknown = JSON.parse(rawConfig);

  if (!isGitQuackConfig(parsedConfig)) {
    throw new Error(`Invalid ${configFileName} configuration.`);
  }

  return parsedConfig;
}
