import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeBranchDescription } from '../src/branches/normalize-branch-description.js';
import { suggestBranchNames } from '../src/branches/suggest-branch-names.js';
import { validateBranchName } from '../src/branches/validate-branch-name.js';
import { defaultConfig } from '../src/config/defaults.js';
import { readConfig } from '../src/config/read.js';
import { legacyConfigFileName } from '../src/config/write.js';
import { handleBranchNamingAfterCheckout } from '../src/hooks/post-checkout.js';
import { formatBranchNamingGuidance } from '../src/ui/branch-messages.js';

const temporaryDirectories: string[] = [];

function validate(branchName: string) {
  return validateBranchName(branchName, {
    protectedBranches: defaultConfig.protectedBranches,
    branchNaming: defaultConfig.branchNaming
  });
}

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'gitquack-branch-'));
  temporaryDirectories.push(directory);
  return directory;
}

describe('branch-name validation', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { force: true, recursive: true }))
    );
  });

  it('accepts valid branch names', () => {
    expect(validate('feature/student-login').valid).toBe(true);
    expect(validate('feat/student-login').valid).toBe(true);
    expect(validate('fix/navbar-overflow').valid).toBe(true);
    expect(validate('hotfix/payment-timeout').valid).toBe(true);
    expect(validate('docs/setup-instructions').valid).toBe(true);
    expect(validate('refactor/auth-service').valid).toBe(true);
    expect(validate('test/user-registration').valid).toBe(true);
    expect(validate('chore/update-dependencies').valid).toBe(true);
  });

  it('detects missing prefixes', () => {
    expect(validate('login')).toMatchObject({
      valid: false,
      reason: 'missing-prefix',
      suggestions: ['feature/login', 'feat/login', 'fix/login']
    });
  });

  it('detects unsupported prefixes', () => {
    expect(validate('random/test')).toMatchObject({
      valid: false,
      reason: 'unsupported-prefix',
      suggestions: ['test/test', 'feature/test', 'feat/test']
    });
  });

  it('detects missing descriptions', () => {
    expect(validate('fix/')).toMatchObject({
      valid: false,
      reason: 'missing-description'
    });
  });

  it('detects uppercase descriptions', () => {
    expect(validate('feature/LoginPage')).toMatchObject({
      valid: false,
      reason: 'invalid-description',
      suggestions: ['feature/loginpage', 'feat/loginpage', 'fix/loginpage']
    });
  });

  it('detects underscore-separated descriptions', () => {
    expect(validate('feature/login_page')).toMatchObject({
      valid: false,
      reason: 'invalid-description',
      suggestions: ['feature/login-page', 'feat/login-page', 'fix/login-page']
    });
  });

  it('detects descriptions containing spaces', () => {
    expect(validate('feature/add login')).toMatchObject({
      valid: false,
      reason: 'invalid-description',
      suggestions: ['feature/add-login', 'feat/add-login', 'fix/add-login']
    });
  });

  it('allows protected branches', () => {
    expect(validate('main').valid).toBe(true);
    expect(validate('master').valid).toBe(true);
    expect(validate('develop').valid).toBe(true);
  });

  it('generates suggestions', () => {
    expect(
      suggestBranchNames('feature/Login_Page', defaultConfig.branchNaming)
    ).toEqual(['feature/login-page', 'feat/login-page', 'fix/login-page']);
  });

  it('prefers fix suggestions for bug-like branch names', () => {
    expect(
      suggestBranchNames('login-error', defaultConfig.branchNaming)
    ).toEqual(['fix/login-error', 'feature/login-error', 'feat/login-error']);
  });

  it('prefers chore suggestions for maintenance branch names', () => {
    expect(
      suggestBranchNames('update-dependencies', defaultConfig.branchNaming)
    ).toEqual([
      'chore/update-dependencies',
      'feature/update-dependencies',
      'feat/update-dependencies'
    ]);
  });

  it('prefers docs suggestions for documentation branch names', () => {
    expect(
      suggestBranchNames('readme-update', defaultConfig.branchNaming)
    ).toEqual([
      'docs/readme-update',
      'chore/readme-update',
      'feature/readme-update'
    ]);
  });

  it('prefers test suggestions for test branch names', () => {
    expect(
      suggestBranchNames('login-spec', defaultConfig.branchNaming)
    ).toEqual(['test/login-spec', 'feature/login-spec', 'feat/login-spec']);
  });

  it('suggests from the description after an unsupported prefix', () => {
    expect(validate('feat/branch-naming-guard').valid).toBe(true);
  });

  it('normalizes repeated hyphens', () => {
    expect(normalizeBranchDescription('Login___   Page!!!')).toBe('login-page');
  });

  it('skips disabled branch-name warnings', async () => {
    const messages: string[] = [];

    await handleBranchNamingAfterCheckout({
      config: { ...defaultConfig, branchNamingWarning: false },
      repositoryRoot: 'unused',
      branchName: 'login',
      checkoutFlag: '1',
      isInteractive: true,
      writeLine: (message) => messages.push(message)
    });

    expect(messages).toEqual([]);
  });

  it('skips detached HEAD handling', async () => {
    const messages: string[] = [];

    await handleBranchNamingAfterCheckout({
      config: defaultConfig,
      repositoryRoot: 'unused',
      branchName: null,
      checkoutFlag: '1',
      isInteractive: true,
      writeLine: (message) => messages.push(message)
    });

    expect(messages).toEqual([]);
  });

  it('checks post-checkout flag 1', async () => {
    const messages: string[] = [];

    await handleBranchNamingAfterCheckout({
      config: defaultConfig,
      repositoryRoot: 'unused',
      branchName: 'login',
      checkoutFlag: '1',
      isInteractive: false,
      writeLine: (message) => messages.push(message)
    });

    expect(messages.join('\n')).toContain('login');
  });

  it('shows the GitQuack guard and can colorize branch guidance', () => {
    const result = validate('login');

    expect(formatBranchNamingGuidance(result, true)).toContain(
      'GITQUACK GUARD'
    );
    expect(
      formatBranchNamingGuidance(result, true, { useColor: true })
    ).toContain('\u001B[');
  });

  it('renames only after explicit interactive selection', async () => {
    const messages: string[] = [];
    const renamedBranches: string[] = [];
    const prompts: string[] = [];

    await handleBranchNamingAfterCheckout({
      config: defaultConfig,
      repositoryRoot: 'unused',
      branchName: 'login',
      checkoutFlag: '1',
      isInteractive: true,
      select: (message, options) => {
        prompts.push(message);
        return Promise.resolve(options[0]?.value ?? '');
      },
      renameBranch: (branchName) => {
        renamedBranches.push(branchName);
        return Promise.resolve();
      },
      writeLine: (message) => messages.push(message)
    });

    expect(prompts).toEqual([
      'What would you like to do?',
      'Choose a branch name:'
    ]);
    expect(renamedBranches).toEqual(['feature/login']);
    expect(messages).toContain(
      'GitQuack renamed the current branch to "feature/login".'
    );
  });

  it('does not rename after rejection', async () => {
    const messages: string[] = [];
    const renamedBranches: string[] = [];

    await handleBranchNamingAfterCheckout({
      config: defaultConfig,
      repositoryRoot: 'unused',
      branchName: 'login',
      checkoutFlag: '1',
      isInteractive: true,
      select: () => Promise.resolve('skip'),
      renameBranch: (branchName) => {
        renamedBranches.push(branchName);
        return Promise.resolve();
      },
      writeLine: (message) => messages.push(message)
    });

    expect(renamedBranches).toEqual([]);
    expect(messages).toContain(
      'GitQuack left the current branch name unchanged.'
    );
  });

  it('skips post-checkout flag 0', async () => {
    const messages: string[] = [];

    await handleBranchNamingAfterCheckout({
      config: defaultConfig,
      repositoryRoot: 'unused',
      branchName: 'login',
      checkoutFlag: '0',
      isInteractive: false,
      writeLine: (message) => messages.push(message)
    });

    expect(messages).toEqual([]);
  });

  it('keeps backward compatibility with old configuration files', async () => {
    const directory = await createTemporaryDirectory();

    await writeFile(
      join(directory, legacyConfigFileName),
      `${JSON.stringify({
        version: 1,
        protectedBranches: ['main'],
        directPushWarning: true,
        branchNamingWarning: true,
        detailedExplanations: true
      })}\n`
    );

    await expect(readConfig(directory)).resolves.toMatchObject({
      branchNaming: defaultConfig.branchNaming
    });
  });
});
