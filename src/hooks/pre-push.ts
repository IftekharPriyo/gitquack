import type { GitQuackConfig } from '../config/types.js';
import {
  type PushRefUpdate,
  PrePushParseError,
  parsePrePushInput
} from './parse-pre-push.js';
import { findProtectedPushBranches } from './protected-branches.js';
import {
  type PromptForConfirmation,
  isAffirmativeAnswer,
  promptForConfirmation
} from '../prompts/confirm-push.js';
import {
  formatProtectedBranchWarning,
  nonInteractiveProtectedPushMessage
} from '../ui/messages.js';

export interface PrePushOptions {
  config: GitQuackConfig;
  input: string;
  isInteractive: boolean;
  useColor?: boolean;
  prompt?: PromptForConfirmation;
  writeError: (message: string) => void;
}

export async function shouldAllowPush({
  config,
  input,
  isInteractive,
  useColor = false,
  prompt = promptForConfirmation,
  writeError
}: PrePushOptions): Promise<boolean> {
  let updates: PushRefUpdate[];

  try {
    updates = parsePrePushInput(input);
  } catch (error) {
    if (error instanceof PrePushParseError) {
      writeError(error.message);
      return false;
    }

    throw error;
  }

  if (!config.directPushWarning) {
    return true;
  }

  const protectedBranches = findProtectedPushBranches(
    updates,
    config.protectedBranches
  );

  if (protectedBranches.length === 0) {
    return true;
  }

  if (!isInteractive) {
    writeError(nonInteractiveProtectedPushMessage);
    return false;
  }

  const answer = await prompt(
    formatProtectedBranchWarning(
      protectedBranches,
      config.detailedExplanations,
      {
        useColor
      }
    )
  );

  return isAffirmativeAnswer(answer);
}
