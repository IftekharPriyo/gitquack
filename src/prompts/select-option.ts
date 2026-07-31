import { stdin, stdout } from 'node:process';
import { emitKeypressEvents } from 'node:readline';

export interface SelectOption {
  label: string;
  value: string;
}

function renderSelect(
  message: string,
  options: SelectOption[],
  index: number
): void {
  const lines = [
    message,
    '',
    ...options.map((option, optionIndex) => {
      const marker = optionIndex === index ? '>' : ' ';
      return `${marker} ${option.label}`;
    })
  ];

  stdout.write(`\r\x1B[2K${lines.join('\n')}`);
}

export async function selectOption(
  message: string,
  options: SelectOption[]
): Promise<string> {
  if (options.length === 0) {
    throw new Error('Cannot render an empty option list.');
  }

  if (!stdin.isTTY || !stdout.isTTY) {
    return options[0]?.value ?? '';
  }

  let index = 0;

  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  renderSelect(message, options, index);

  return new Promise((resolve) => {
    const cleanup = (): void => {
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      stdin.off('keypress', handleKeypress);
    };

    const handleKeypress = (
      _character: string | undefined,
      key: { name?: string; ctrl?: boolean }
    ): void => {
      if (key.ctrl === true && key.name === 'c') {
        cleanup();
        resolve('');
        return;
      }

      if (key.name === 'up') {
        index = index === 0 ? options.length - 1 : index - 1;
        stdout.write(`\x1B[${String(options.length + 1)}A`);
        renderSelect(message, options, index);
        return;
      }

      if (key.name === 'down') {
        index = index === options.length - 1 ? 0 : index + 1;
        stdout.write(`\x1B[${String(options.length + 1)}A`);
        renderSelect(message, options, index);
        return;
      }

      if (key.name === 'return') {
        cleanup();
        resolve(options[index]?.value ?? '');
      }
    };

    stdin.on('keypress', handleKeypress);
  });
}
