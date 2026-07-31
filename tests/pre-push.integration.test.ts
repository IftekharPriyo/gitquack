import { execFile } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { initializeGitQuack } from '../src/commands/init.js';
import { configFileName } from '../src/config/write.js';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

interface PushTestRepository {
  remote: string;
  worktree: string;
  gitQuackCommand: string;
}

function pathForShell(path: string): string {
  const slashPath = path.replaceAll('\\', '/');
  return slashPath.replace(/^([A-Za-z]):\//, (_match, drive: string) => {
    return `/${drive.toLowerCase()}/`;
  });
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'gitquack-push-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
}

function gitEnvironment(gitQuackCommand: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GITQUACK_COMMAND: pathForShell(gitQuackCommand),
    GITQUACK_DISABLE_TTY: '1'
  };
}

async function createGitQuackShim(): Promise<string> {
  const directory = await createTemporaryDirectory();
  const shim = join(directory, 'gitquack');
  const projectPath = pathForShell(projectRoot);

  await writeFile(
    shim,
    `#!/bin/sh
exec "${projectPath}/node_modules/.bin/tsx" "${projectPath}/src/cli.ts" "$@"
`
  );
  await chmod(shim, 0o755);

  return shim;
}

async function writeSourceHooks(worktree: string): Promise<void> {
  const hooksDirectory = join(worktree, '.gitquack-hooks', 'hooks');
  const projectPath = pathForShell(projectRoot);
  const prePushHook = join(hooksDirectory, 'pre-push');
  const postCheckoutHook = join(hooksDirectory, 'post-checkout');

  await writeFile(
    prePushHook,
    `#!/bin/sh
gitquack_pre_push_input=$(cat)
GITQUACK_PRE_PUSH_INPUT="$gitquack_pre_push_input" exec "${projectPath}/node_modules/.bin/tsx" "${projectPath}/src/cli.ts" hook pre-push "$@" < /dev/null
`
  );
  await writeFile(
    postCheckoutHook,
    `#!/bin/sh
GITQUACK_DISABLE_TTY=1 exec "${projectPath}/node_modules/.bin/tsx" "${projectPath}/src/cli.ts" hook post-checkout "$@" < /dev/null
`
  );
  await chmod(prePushHook, 0o755);
  await chmod(postCheckoutHook, 0o755);
}

async function createPushTestRepository(): Promise<PushTestRepository> {
  const root = await createTemporaryDirectory();
  const remote = join(root, 'remote.git');
  const worktree = join(root, 'worktree');
  const gitQuackCommand = await createGitQuackShim();

  await mkdir(worktree);
  await execFileAsync('git', ['init', '--bare', remote]);
  await execFileAsync('git', ['init'], { cwd: worktree });
  await git(worktree, [
    'config',
    '--local',
    'user.email',
    'student@example.test'
  ]);
  await git(worktree, ['config', '--local', 'user.name', 'Student']);
  await git(worktree, ['remote', 'add', 'origin', remote]);
  await writeFile(join(worktree, 'README.md'), '# Example\n');
  await git(worktree, ['add', 'README.md']);
  await git(worktree, ['commit', '-m', 'Initial commit']);
  await git(worktree, ['branch', '-M', 'main']);
  await initializeGitQuack({
    cwd: worktree,
    writeLine: () => undefined
  });
  await writeSourceHooks(worktree);

  return { remote, worktree, gitQuackCommand };
}

async function push(
  repository: PushTestRepository,
  args: string[]
): Promise<{ exitCode: number; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd: repository.worktree,
      env: gitEnvironment(repository.gitQuackCommand)
    });
    return { exitCode: 0, stderr: `${stdout}${stderr}` };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'stderr' in error
    ) {
      return {
        exitCode: typeof error.code === 'number' ? error.code : 1,
        stderr: `${'stdout' in error ? String(error.stdout) : ''}${String(error.stderr)}`
      };
    }

    throw error;
  }
}

async function remoteRefExists(remote: string, ref: string): Promise<boolean> {
  try {
    await execFileAsync('git', ['rev-parse', '--verify', ref], { cwd: remote });
    return true;
  } catch {
    return false;
  }
}

describe('pre-push hook integration', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    );
  });

  it('push to feature/student-login succeeds without confirmation', async () => {
    const repository = await createPushTestRepository();

    await git(repository.worktree, ['switch', '-c', 'feature/student-login']);
    await writeFile(join(repository.worktree, 'feature.txt'), 'feature\n');
    await git(repository.worktree, ['add', 'feature.txt']);
    await git(repository.worktree, ['commit', '-m', 'Add feature']);

    const result = await push(repository, [
      'push',
      'origin',
      'feature/student-login'
    ]);

    expect(result.exitCode, result.stderr).toBe(0);
  });

  it('push to main is cancelled after rejection in a non-interactive environment', async () => {
    const repository = await createPushTestRepository();
    const localHead = await git(repository.worktree, ['rev-parse', 'HEAD']);

    const result = await push(repository, ['push', 'origin', 'main']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('The push was cancelled');
    await expect(git(repository.worktree, ['rev-parse', 'HEAD'])).resolves.toBe(
      localHead
    );
    await expect(
      remoteRefExists(repository.remote, 'refs/heads/main')
    ).resolves.toBe(false);
  });

  it('disabling directPushWarning allows the protected-branch push', async () => {
    const repository = await createPushTestRepository();
    const configPath = join(repository.worktree, configFileName);
    const rawConfig = await readFile(configPath, 'utf8');
    const config: unknown = JSON.parse(rawConfig);

    if (typeof config !== 'object' || config === null) {
      throw new Error('Expected object config.');
    }

    await writeFile(
      configPath,
      `${JSON.stringify({ ...config, directPushWarning: false }, null, 2)}\n`
    );

    const result = await push(repository, ['push', 'origin', 'main']);

    expect(result.exitCode, result.stderr).toBe(0);
  });
});
