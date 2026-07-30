export class CliError extends Error {
  constructor(
    message: string,
    readonly exitCode = 1
  ) {
    super(message);
    this.name = 'CliError';
  }
}

export function isCliError(error: unknown): error is CliError {
  return error instanceof CliError;
}
