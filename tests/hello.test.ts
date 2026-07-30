import { Command } from 'commander';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { helloMessage, registerHelloCommand } from '../src/commands/hello.js';

describe('hello command', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints the ready message', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const program = new Command();

    registerHelloCommand(program);

    await program.parseAsync(['node', 'gitquack', 'hello']);

    expect(log).toHaveBeenCalledWith(helloMessage);
  });
});
