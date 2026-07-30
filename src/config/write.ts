import { constants } from 'node:fs';
import { access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { GitQuackConfig } from './types.js';

export const configFileName = '.gitquack';

export async function configExists(repositoryRoot: string): Promise<boolean> {
  try {
    await access(join(repositoryRoot, configFileName), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function writeConfig(
  repositoryRoot: string,
  config: GitQuackConfig
): Promise<string> {
  const configPath = join(repositoryRoot, configFileName);
  const contents = `${JSON.stringify(config, null, 2)}\n`;

  await writeFile(configPath, contents, { flag: 'wx' });

  return configPath;
}
