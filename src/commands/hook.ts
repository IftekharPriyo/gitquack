import { stdin } from 'node:process';
import { stderr } from 'node:process';
import type { Command } from 'commander';
import { readConfig } from '../config/read.js';
import { CliError } from '../errors/cli-error.js';
import { findRepositoryRoot } from '../git/repository.js';
import { shouldAllowPush } from '../hooks/pre-push.js';

async function readStdin(): Promise<string> {
  const hookInput = process.env.GITQUACK_PRE_PUSH_INPUT;

  if (hookInput !== undefined) {
    return hookInput;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks).toString('utf8');
}

function shouldUseColor(): boolean {
  return (
    stderr.isTTY &&
    'getColorDepth' in stderr &&
    typeof stderr.getColorDepth === 'function' &&
    stderr.getColorDepth() > 1
  );
}

export async function runPrePushHook(cwd: string): Promise<void> {
  const repositoryRoot = await findRepositoryRoot(cwd);

  if (repositoryRoot === null) {
    throw new CliError('GitQuack could not find the Git repository root.');
  }

  const config = await readConfig(repositoryRoot);
  const input = await readStdin();
  const allowed = await shouldAllowPush({
    config,
    input,
    isInteractive: stdin.isTTY,
    useColor: shouldUseColor(),
    writeError: console.error
  });

  if (!allowed) {
    throw new CliError('', 1);
  }
}

export function registerHookCommand(program: Command): void {
  const hook = program.command('hook').description('Run GitQuack Git hooks.');

  hook
    .command('pre-push')
    .argument('[remote]')
    .argument('[remoteUrl]')
    .description('Run the GitQuack pre-push hook.')
    .action(async () => {
      await runPrePushHook(process.cwd());
    });
}
