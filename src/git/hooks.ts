import { chmod, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getLocalGitConfig, setLocalGitConfig } from './config.js';

export const gitQuackHooksPath = '.gitquack-hooks/hooks';
export const prePushHookName = 'pre-push';

function normalizeHooksPath(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/, '');
}

export function isGitQuackHooksPath(path: string): boolean {
  return normalizeHooksPath(path) === gitQuackHooksPath;
}

export function createPrePushHookScript(): string {
  return `#!/bin/sh
set +e
gitquack_pre_push_input=$(cat)
gitquack_command=\${GITQUACK_COMMAND:-gitquack}

if [ "\${GITQUACK_DISABLE_TTY:-}" = "1" ]; then
  GITQUACK_PRE_PUSH_INPUT="$gitquack_pre_push_input" "$gitquack_command" hook pre-push "$@" < /dev/null
elif { : < /dev/tty; } 2>/dev/null; then
  GITQUACK_PRE_PUSH_INPUT="$gitquack_pre_push_input" "$gitquack_command" hook pre-push "$@" < /dev/tty
else
  GITQUACK_PRE_PUSH_INPUT="$gitquack_pre_push_input" "$gitquack_command" hook pre-push "$@" < /dev/null
fi
exit $?
`;
}

export async function installPrePushHook(
  repositoryRoot: string
): Promise<void> {
  const existingHooksPath = await getLocalGitConfig(
    repositoryRoot,
    'core.hooksPath'
  );

  if (existingHooksPath !== null && !isGitQuackHooksPath(existingHooksPath)) {
    throw new Error(`GitQuack could not install its Git hook because this repository already uses:

  ${existingHooksPath}

GitQuack will not overwrite an existing hooks configuration.
Support for integrating with existing hook managers will be added later.`);
  }

  const hooksDirectory = join(repositoryRoot, ...gitQuackHooksPath.split('/'));
  const hookPath = join(hooksDirectory, prePushHookName);

  await mkdir(hooksDirectory, { recursive: true });
  await writeFile(hookPath, createPrePushHookScript(), { mode: 0o755 });
  await chmod(hookPath, 0o755);

  if (existingHooksPath === null) {
    await setLocalGitConfig(
      repositoryRoot,
      'core.hooksPath',
      gitQuackHooksPath
    );
  }
}
