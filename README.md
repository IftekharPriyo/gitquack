# GitQuack

Better Git habits, one quack at a time

GitQuack will become a local Git learning assistant for students, designed to run in common terminal environments such as Git Bash, PowerShell, macOS Terminal, Linux terminals, and the VS Code integrated terminal. The project currently contains only the initial TypeScript CLI scaffolding.

## Status

Initial scaffold only. There are no Git hooks, command interception, warnings, configuration logic, branch-name validation, push interception, telemetry, network requests, or GitQuack learning features yet.

## Development Installation

```bash
pnpm install
pnpm build
pnpm link --global
gitquack hello
```

## Available Commands

```bash
gitquack hello
```

Prints:

```text
🦆 GitQuack is ready.
```

## Development Scripts

```bash
pnpm dev
pnpm build
pnpm test
pnpm test:watch
pnpm lint
pnpm format
pnpm format:check
pnpm typecheck
```
