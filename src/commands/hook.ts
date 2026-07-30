import { stdin } from 'node:process';
import { stderr } from 'node:process';
import type { Command } from 'commander';
import { readConfig } from '../config/read.js';
import { CliError } from '../errors/cli-error.js';
import { getCurrentBranch } from '../git/branch.js';
import { findRepositoryRoot } from '../git/repository.js';
import { handleBranchNamingAfterCheckout } from '../hooks/post-checkout.js';
import { shouldAllowPush } from '../hooks/pre-push.js';
import { shouldUseColor } from '../ui/terminal.js';

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
    useColor: shouldUseColor(stderr),
    writeError: console.error
  });

  if (!allowed) {
    throw new CliError('', 1);
  }
}

export async function runPostCheckoutHook(
  cwd: string,
  checkoutFlag: string
): Promise<void> {
  const repositoryRoot = await findRepositoryRoot(cwd);

  if (repositoryRoot === null) {
    throw new CliError('GitQuack could not find the Git repository root.');
  }

  const config = await readConfig(repositoryRoot);
  const branchName = await getCurrentBranch(repositoryRoot);

  await handleBranchNamingAfterCheckout({
    config,
    repositoryRoot,
    branchName,
    checkoutFlag,
    isInteractive: stdin.isTTY,
    useColor: shouldUseColor(stderr),
    writeLine: console.error
  });
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

  hook
    .command('post-checkout')
    .argument('[previousHead]')
    .argument('[newHead]')
    .argument('<flag>')
    .description('Run the GitQuack post-checkout hook.')
    .action(
      async (
        _previousHead: string | undefined,
        _newHead: string | undefined,
        flag: string
      ) => {
        await runPostCheckoutHook(process.cwd(), flag);
      }
    );
}
