import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getCurrentBranch(
  repositoryRoot: string
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['branch', '--show-current'],
      { cwd: repositoryRoot }
    );
    const branchName = stdout.trim();
    return branchName.length > 0 ? branchName : null;
  } catch {
    return null;
  }
}

export async function renameCurrentBranch(
  repositoryRoot: string,
  branchName: string
): Promise<void> {
  await execFileAsync('git', ['branch', '-m', branchName], {
    cwd: repositoryRoot
  });
}
