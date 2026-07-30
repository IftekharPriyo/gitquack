import type { GitQuackConfig } from '../config/types.js';
import { renameCurrentBranch } from '../git/branch.js';
import { validateBranchName } from '../branches/validate-branch-name.js';
import { selectOption } from '../prompts/select-option.js';
import {
  formatBranchNamingGuidance,
  formatRenamedBranchMessage,
  renameSkippedMessage
} from '../ui/branch-messages.js';

export type SelectBranchOption = (
  message: string,
  options: { label: string; value: string }[]
) => Promise<string>;

export interface BranchNamingOptions {
  config: GitQuackConfig;
  repositoryRoot: string;
  branchName: string | null;
  checkoutFlag: string;
  isInteractive: boolean;
  useColor?: boolean;
  select?: SelectBranchOption;
  renameBranch?: (branchName: string) => Promise<void>;
  writeLine: (message: string) => void;
}

export async function handleBranchNamingAfterCheckout({
  config,
  repositoryRoot,
  branchName,
  checkoutFlag,
  isInteractive,
  useColor = false,
  select = selectOption,
  renameBranch = (newBranchName) =>
    renameCurrentBranch(repositoryRoot, newBranchName),
  writeLine
}: BranchNamingOptions): Promise<void> {
  if (
    checkoutFlag !== '1' ||
    branchName === null ||
    !config.branchNamingWarning
  ) {
    return;
  }

  const result = validateBranchName(branchName, {
    protectedBranches: config.protectedBranches,
    branchNaming: config.branchNaming
  });

  if (result.valid) {
    return;
  }

  writeLine(
    formatBranchNamingGuidance(result, config.detailedExplanations, {
      useColor
    })
  );

  const primarySuggestion = result.suggestions[0];

  if (!isInteractive || primarySuggestion === undefined) {
    return;
  }

  const action = await select('What would you like to do?', [
    { label: 'Rename branch now', value: 'rename' },
    { label: 'Do not rename now', value: 'skip' }
  ]);

  if (action !== 'rename') {
    writeLine(renameSkippedMessage);
    return;
  }

  const selectedBranchName = await select(
    'Choose a branch name:',
    result.suggestions.map((suggestion) => ({
      label: suggestion,
      value: suggestion
    }))
  );

  if (selectedBranchName.length === 0) {
    writeLine(renameSkippedMessage);
    return;
  }

  await renameBranch(selectedBranchName);
  writeLine(formatRenamedBranchMessage(selectedBranchName));
}
