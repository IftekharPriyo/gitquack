export interface PushRefUpdate {
  localRef: string;
  localObjectId: string;
  remoteRef: string;
  remoteObjectId: string;
}

export class PrePushParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PrePushParseError';
  }
}

export function parsePrePushInput(input: string): PushRefUpdate[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line) => {
    const parts = line.split(/\s+/);

    if (parts.length !== 4) {
      throw new PrePushParseError(
        'GitQuack could not safely parse Git pre-push input. The push was cancelled.'
      );
    }

    const [localRef, localObjectId, remoteRef, remoteObjectId] = parts;

    if (
      localRef === undefined ||
      localObjectId === undefined ||
      remoteRef === undefined ||
      remoteObjectId === undefined
    ) {
      throw new PrePushParseError(
        'GitQuack could not safely parse Git pre-push input. The push was cancelled.'
      );
    }

    return {
      localRef,
      localObjectId,
      remoteRef,
      remoteObjectId
    };
  });
}
