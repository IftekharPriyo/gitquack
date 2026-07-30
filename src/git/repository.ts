import { execFile } from 'node:child_process';
import { normalize } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function findRepositoryRoot(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--show-toplevel'],
      { cwd }
    );
    return normalize(stdout.trim());
  } catch {
    return null;
  }
}
