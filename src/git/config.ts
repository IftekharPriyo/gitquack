import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getLocalGitConfig(
  repositoryRoot: string,
  key: string
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['config', '--local', '--get', key],
      {
        cwd: repositoryRoot
      }
    );
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function setLocalGitConfig(
  repositoryRoot: string,
  key: string,
  value: string
): Promise<void> {
  await execFileAsync('git', ['config', '--local', key, value], {
    cwd: repositoryRoot
  });
}
