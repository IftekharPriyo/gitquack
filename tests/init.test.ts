import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config/defaults.js';
import { configFileName } from '../src/config/write.js';
import { CliError } from '../src/errors/cli-error.js';
import { initializeGitQuack } from '../src/commands/init.js';
import { gitQuackHooksPath, prePushHookName } from '../src/git/hooks.js';

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'gitquack-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function createTemporaryGitRepository(): Promise<string> {
  const repository = await createTemporaryDirectory();
  await execFileAsync('git', ['init'], { cwd: repository });
  return repository;
}

async function readConfig(repositoryRoot: string): Promise<string> {
  return readFile(join(repositoryRoot, configFileName), 'utf8');
}

async function getLocalConfig(
  repositoryRoot: string,
  key: string
): Promise<string> {
  const { stdout } = await execFileAsync(
    'git',
    ['config', '--local', '--get', key],
    {
      cwd: repositoryRoot
    }
  );
  return stdout.trim();
}

describe('init command', () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    );
  });

  it('initializes inside a valid temporary Git repository', async () => {
    const repository = await createTemporaryGitRepository();
    const messages: string[] = [];

    await initializeGitQuack({
      cwd: repository,
      writeLine: (message) => messages.push(message)
    });

    await expect(readConfig(repository)).resolves.toBe(
      `${JSON.stringify(defaultConfig, null, 2)}\n`
    );
    expect(messages).toEqual([
      `🦆 GitQuack initialized successfully.

Repository:
${repository}

Configuration:
${join(repository, configFileName)}`
    ]);
  });

  it('fails outside a Git repository', async () => {
    const directory = await createTemporaryDirectory();

    await expect(
      initializeGitQuack({
        cwd: directory,
        writeLine: () => undefined
      })
    ).rejects.toEqual(
      new CliError(`This directory is not inside a Git repository.

Run:

  git init

or move into an existing Git project before running:

  gitquack init`)
    );
  });

  it('does not overwrite an existing configuration', async () => {
    const repository = await createTemporaryGitRepository();
    const existingConfig = '{"version":1,"custom":true}\n';
    const messages: string[] = [];

    await writeFile(join(repository, configFileName), existingConfig);

    await initializeGitQuack({
      cwd: repository,
      writeLine: (message) => messages.push(message)
    });

    await expect(readConfig(repository)).resolves.toBe(existingConfig);
    expect(messages).toEqual([
      'GitQuack is already initialized in this repository.'
    ]);
  });

  it('creates the expected configuration', async () => {
    const repository = await createTemporaryGitRepository();

    await initializeGitQuack({
      cwd: repository,
      writeLine: () => undefined
    });

    await expect(readConfig(repository)).resolves.toBe(
      `${JSON.stringify(
        {
          version: 1,
          protectedBranches: ['main', 'master', 'develop'],
          directPushWarning: true,
          branchNamingWarning: true,
          detailedExplanations: true
        },
        null,
        2
      )}\n`
    );
  });

  it('detects the repository root from a nested directory', async () => {
    const repository = await createTemporaryGitRepository();
    const nestedDirectory = join(repository, 'one', 'two');

    await mkdir(nestedDirectory, { recursive: true });

    await initializeGitQuack({
      cwd: nestedDirectory,
      writeLine: () => undefined
    });

    await expect(readConfig(repository)).resolves.toBe(
      `${JSON.stringify(defaultConfig, null, 2)}\n`
    );
  });

  it('installs the pre-push hook', async () => {
    const repository = await createTemporaryGitRepository();

    await initializeGitQuack({
      cwd: repository,
      writeLine: () => undefined
    });

    const hook = await stat(
      join(repository, ...gitQuackHooksPath.split('/'), prePushHookName)
    );
    expect(hook.isFile()).toBe(true);
  });

  it('sets core.hooksPath locally', async () => {
    const repository = await createTemporaryGitRepository();

    await initializeGitQuack({
      cwd: repository,
      writeLine: () => undefined
    });

    await expect(getLocalConfig(repository, 'core.hooksPath')).resolves.toBe(
      gitQuackHooksPath
    );
  });

  it('detects an existing conflicting hooks path', async () => {
    const repository = await createTemporaryGitRepository();

    await execFileAsync(
      'git',
      ['config', '--local', 'core.hooksPath', '.husky'],
      {
        cwd: repository
      }
    );

    await expect(
      initializeGitQuack({
        cwd: repository,
        writeLine: () => undefined
      })
    ).rejects.toThrow('GitQuack could not install its Git hook');
  });
});
