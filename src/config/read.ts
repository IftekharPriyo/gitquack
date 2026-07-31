import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultConfig } from './defaults.js';
import { configFileName, legacyConfigFileName } from './write.js';
import type { BranchNamingConfig, GitQuackConfig } from './types.js';

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isBranchNamingConfig(value: unknown): value is BranchNamingConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    'allowedPrefixes' in value &&
    isStringArray(value.allowedPrefixes) &&
    'separator' in value &&
    typeof value.separator === 'string' &&
    value.separator.length > 0 &&
    'descriptionPattern' in value &&
    typeof value.descriptionPattern === 'string'
  );
}

function isGitQuackConfigBase(value: unknown): value is Omit<
  GitQuackConfig,
  'branchNaming'
> & {
  branchNaming?: unknown;
} {
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

function normalizeConfig(value: unknown): GitQuackConfig | null {
  if (!isGitQuackConfigBase(value)) {
    return null;
  }

  if (
    value.branchNaming !== undefined &&
    !isBranchNamingConfig(value.branchNaming)
  ) {
    return null;
  }

  return {
    ...value,
    branchNaming: value.branchNaming ?? defaultConfig.branchNaming
  };
}

export async function readConfig(
  repositoryRoot: string
): Promise<GitQuackConfig> {
  let rawConfig: string;

  try {
    rawConfig = await readFile(join(repositoryRoot, configFileName), 'utf8');
  } catch {
    rawConfig = await readFile(
      join(repositoryRoot, legacyConfigFileName),
      'utf8'
    );
  }

  const parsedConfig: unknown = JSON.parse(rawConfig);

  const config = normalizeConfig(parsedConfig);

  if (config === null) {
    throw new Error(`Invalid ${configFileName} configuration.`);
  }

  return config;
}
