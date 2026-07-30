import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export type PromptForConfirmation = (message: string) => Promise<string>;

export async function promptForConfirmation(message: string): Promise<string> {
  const readline = createInterface({ input, output });

  try {
    return await readline.question(message);
  } finally {
    readline.close();
  }
}

export function isAffirmativeAnswer(answer: string): boolean {
  const normalizedAnswer = answer.trim().toLowerCase();
  return normalizedAnswer === 'y' || normalizedAnswer === 'yes';
}
