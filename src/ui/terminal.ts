import type { WriteStream } from 'node:tty';

export function shouldUseColor(stream: WriteStream): boolean {
  if (!stream.isTTY || process.env.NO_COLOR !== undefined) {
    return false;
  }

  if ('getColorDepth' in stream && typeof stream.getColorDepth === 'function') {
    return stream.getColorDepth() > 1;
  }

  return process.env.TERM !== 'dumb';
}
