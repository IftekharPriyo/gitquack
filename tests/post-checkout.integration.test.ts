import { execFile } from 'node:child_process';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { initializeGitQuack } from '../src/commands/init.js';
import { configFileName } from '../src/config/write.js';
import {
  createPrePushHookScript,
  gitQuackHooksPath,
  postCheckoutHookName,
  prePushHookName
} from '../src/git/hooks.js';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

interface CheckoutTestRepository {
  worktree: string;
  gitQuackCommand: string;
}

function pathForShell(path: string): string {
  const slashPath = path.replaceAll('\\', '/');
  return slashPath.replace(/^([A-Za-z]):\//, (_match, drive: string) => {
    return `/${drive.toLowerCase()}/`;
  });
}

function gitEnvironment(gitQuackCommand: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    GITQUACK_COMMAND: pathForShell(gitQuackCommand),
    GITQUACK_DISABLE_TTY: '1'
  };
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'gitquack-checkout-'));
  temporaryDirectories.push(directory);
  return directory;
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

async function writeSourcePostCheckoutHook(worktree: string): Promise<void> {
  const hooksDirectory = join(worktree, '.gitquack-hooks', 'hooks');
  const projectPath = pathForShell(projectRoot);
  const postCheckoutHook = join(hooksDirectory, 'post-checkout');

  await writeFile(
    postCheckoutHook,
    `#!/bin/sh
if [ "\${GITQUACK_DISABLE_TTY:-}" = "1" ]; then
  exec "${projectPath}/node_modules/.bin/tsx" "${projectPath}/src/cli.ts" hook post-checkout "$@" < /dev/null
elif { : < /dev/tty; } 2>/dev/null; then
  exec "${projectPath}/node_modules/.bin/tsx" "${projectPath}/src/cli.ts" hook post-checkout "$@" < /dev/tty
else
  exec "${projectPath}/node_modules/.bin/tsx" "${projectPath}/src/cli.ts" hook post-checkout "$@" < /dev/null
fi
`
  );
  await chmod(postCheckoutHook, 0o755);
}

async function git(
  cwd: string,
  args: string[],
  env?: NodeJS.ProcessEnv
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync('git', args, { cwd, env });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function runCli(
  cwd: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [
      join(projectRoot, 'node_modules/tsx/dist/cli.mjs'),
      join(projectRoot, 'src/cli.ts'),
      ...args
    ],
    { cwd }
  );
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function createCheckoutTestRepository(): Promise<CheckoutTestRepository> {
  const worktree = await createTemporaryDirectory();
  const gitQuackCommand = await createGitQuackShim();

  await execFileAsync('git', ['init'], { cwd: worktree });
  await git(worktree, [
    'config',
    '--local',
    'user.email',
    'student@example.test'
  ]);
  await git(worktree, ['config', '--local', 'user.name', 'Student']);
  await writeFile(join(worktree, 'README.md'), '# Example\n');
  await git(worktree, ['add', 'README.md']);
  await git(worktree, ['commit', '-m', 'Initial commit']);
  await git(worktree, ['branch', '-M', 'main']);
  await initializeGitQuack({
    cwd: worktree,
    writeLine: () => undefined
  });
  await writeSourcePostCheckoutHook(worktree);

  return { worktree, gitQuackCommand };
}

async function readConfigObject(
  worktree: string
): Promise<Record<string, unknown>> {
  const rawConfig = await readFile(join(worktree, configFileName), 'utf8');
  const config: unknown = JSON.parse(rawConfig);

  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new Error('Expected object config.');
  }

  return config as Record<string, unknown>;
}

describe('post-checkout hook integration', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    );
  });

  it('gitquack init installs the post-checkout hook', async () => {
    const repository = await createCheckoutTestRepository();
    const hook = await stat(
      join(
        repository.worktree,
        ...gitQuackHooksPath.split('/'),
        postCheckoutHookName
      )
    );

    expect(hook.isFile()).toBe(true);
  });

  it('existing Milestone 2 installations receive the missing hook', async () => {
    const worktree = await createTemporaryDirectory();
    const hooksDirectory = join(worktree, ...gitQuackHooksPath.split('/'));

    await execFileAsync('git', ['init'], { cwd: worktree });
    await writeFile(
      join(worktree, configFileName),
      '{"version":1,"protectedBranches":["main","master","develop"],"directPushWarning":true,"branchNamingWarning":true,"detailedExplanations":true}\n'
    );
    await mkdir(hooksDirectory, { recursive: true });
    await writeFile(
      join(hooksDirectory, prePushHookName),
      createPrePushHookScript()
    );
    await git(worktree, [
      'config',
      '--local',
      'core.hooksPath',
      gitQuackHooksPath
    ]);

    await initializeGitQuack({
      cwd: worktree,
      writeLine: () => undefined
    });

    const hook = await stat(join(hooksDirectory, postCheckoutHookName));
    expect(hook.isFile()).toBe(true);
  });

  it('switching to feature/student-login produces no warning', async () => {
    const repository = await createCheckoutTestRepository();
    const result = await git(
      repository.worktree,
      ['switch', '-c', 'feature/student-login'],
      gitEnvironment(repository.gitQuackCommand)
    );

    expect(result.stderr).not.toContain('does not match');
  });

  it('creating login produces branch-name guidance and does not fail checkout', async () => {
    const repository = await createCheckoutTestRepository();
    const result = await git(
      repository.worktree,
      ['switch', '-c', 'login'],
      gitEnvironment(repository.gitQuackCommand)
    );

    expect(result.stderr).toContain('does not match');
    await expect(
      git(repository.worktree, ['branch', '--show-current'])
    ).resolves.toMatchObject({ stdout: 'login' });
  });

  it('switching to main produces no naming warning', async () => {
    const repository = await createCheckoutTestRepository();

    await git(
      repository.worktree,
      ['switch', '-c', 'feature/student-login'],
      gitEnvironment(repository.gitQuackCommand)
    );
    const result = await git(
      repository.worktree,
      ['switch', 'main'],
      gitEnvironment(repository.gitQuackCommand)
    );

    expect(result.stderr).not.toContain('does not match');
  });

  it('checkout with flag 0 produces no warning', async () => {
    const repository = await createCheckoutTestRepository();
    const result = await runCli(repository.worktree, [
      'hook',
      'post-checkout',
      'old',
      'new',
      '0'
    ]);

    expect(result.stderr).toBe('');
  });

  it('detached HEAD produces no naming warning', async () => {
    const repository = await createCheckoutTestRepository();
    const result = await git(
      repository.worktree,
      ['checkout', '--detach', 'HEAD'],
      gitEnvironment(repository.gitQuackCommand)
    );

    expect(result.stderr).not.toContain('does not match');
  });

  it('disabling branchNamingWarning produces no warning', async () => {
    const repository = await createCheckoutTestRepository();
    const config = await readConfigObject(repository.worktree);

    await writeFile(
      join(repository.worktree, configFileName),
      `${JSON.stringify({ ...config, branchNamingWarning: false }, null, 2)}\n`
    );

    const result = await git(
      repository.worktree,
      ['switch', '-c', 'login'],
      gitEnvironment(repository.gitQuackCommand)
    );

    expect(result.stderr).not.toContain('does not match');
  });

  it('gitquack check-branch reports valid and invalid names correctly', async () => {
    const repository = await createCheckoutTestRepository();

    await git(
      repository.worktree,
      ['switch', '-c', 'feature/student-login'],
      gitEnvironment(repository.gitQuackCommand)
    );
    await expect(
      runCli(repository.worktree, ['check-branch'])
    ).resolves.toMatchObject({
      stdout:
        '[ok] Branch "feature/student-login" matches the configured convention.'
    });

    await git(
      repository.worktree,
      ['switch', '-c', 'login'],
      gitEnvironment(repository.gitQuackCommand)
    );
    const invalidResult = await runCli(repository.worktree, ['check-branch']);

    expect(invalidResult.stdout).toContain('does not match');
  });
});
