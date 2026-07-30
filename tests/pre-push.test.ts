import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/config/defaults.js';
import { shouldAllowPush } from '../src/hooks/pre-push.js';
import { parsePrePushInput } from '../src/hooks/parse-pre-push.js';
import {
  branchNameFromRemoteRef,
  findProtectedPushBranches,
  isDeletionRef
} from '../src/hooks/protected-branches.js';

const mainUpdate = 'refs/heads/main abc123 refs/heads/main def456';

describe('pre-push parsing', () => {
  it('parses one valid pre-push ref update', () => {
    expect(parsePrePushInput(mainUpdate)).toEqual([
      {
        localRef: 'refs/heads/main',
        localObjectId: 'abc123',
        remoteRef: 'refs/heads/main',
        remoteObjectId: 'def456'
      }
    ]);
  });

  it('parses multiple ref updates', () => {
    expect(
      parsePrePushInput(`${mainUpdate}
refs/heads/develop aaa refs/heads/develop bbb`)
    ).toHaveLength(2);
  });

  it('handles malformed input', async () => {
    const errors: string[] = [];

    await expect(
      shouldAllowPush({
        config: defaultConfig,
        input: 'refs/heads/main abc123',
        isInteractive: true,
        writeError: (message) => errors.push(message)
      })
    ).resolves.toBe(false);
    expect(errors).toEqual([
      'GitQuack could not safely parse Git pre-push input. The push was cancelled.'
    ]);
  });
});

describe('protected branch detection', () => {
  it('extracts a branch name from refs/heads/main', () => {
    expect(branchNameFromRemoteRef('refs/heads/main')).toBe('main');
  });

  it('identifies configured protected branches', () => {
    expect(
      findProtectedPushBranches(parsePrePushInput(mainUpdate), [
        'main',
        'develop'
      ])
    ).toEqual(['main']);
  });

  it('ignores unprotected branches', () => {
    expect(
      findProtectedPushBranches(
        parsePrePushInput(
          'refs/heads/feature/student-login abc123 refs/heads/feature/student-login def456'
        ),
        ['main']
      )
    ).toEqual([]);
  });

  it('ignores tag refs', () => {
    expect(
      findProtectedPushBranches(
        parsePrePushInput('refs/tags/v1 abc123 refs/tags/v1 def456'),
        ['v1']
      )
    ).toEqual([]);
  });

  it('identifies deletion refs', () => {
    const [update] = parsePrePushInput(
      'refs/heads/main 0000000000000000000000000000000000000000 refs/heads/main def456'
    );

    if (update === undefined) {
      throw new Error('Expected parsed update.');
    }

    expect(isDeletionRef(update)).toBe(true);
  });
});

describe('protected push confirmation', () => {
  it('allows the push after yes', async () => {
    await expect(
      shouldAllowPush({
        config: defaultConfig,
        input: mainUpdate,
        isInteractive: true,
        prompt: () => Promise.resolve('yes'),
        writeError: () => undefined
      })
    ).resolves.toBe(true);
  });

  it('cancels after no', async () => {
    await expect(
      shouldAllowPush({
        config: defaultConfig,
        input: mainUpdate,
        isInteractive: true,
        prompt: () => Promise.resolve('no'),
        writeError: () => undefined
      })
    ).resolves.toBe(false);
  });

  it('cancels after empty input', async () => {
    await expect(
      shouldAllowPush({
        config: defaultConfig,
        input: mainUpdate,
        isInteractive: true,
        prompt: () => Promise.resolve(''),
        writeError: () => undefined
      })
    ).resolves.toBe(false);
  });

  it('handles non-interactive execution', async () => {
    const errors: string[] = [];

    await expect(
      shouldAllowPush({
        config: defaultConfig,
        input: mainUpdate,
        isInteractive: false,
        writeError: (message) => errors.push(message)
      })
    ).resolves.toBe(false);
    expect(errors.join('\n')).toContain(
      'confirmation\ncannot be requested in this environment'
    );
  });
});
