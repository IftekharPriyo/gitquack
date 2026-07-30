# GitQuack

Better Git habits, one quack at a time

GitQuack will become a local Git learning assistant for students, designed to run in common terminal environments such as Git Bash, PowerShell, macOS Terminal, Linux terminals, and the VS Code integrated terminal. The project currently contains Milestone 1: local configuration initialization for an existing Git repository.

## Status

Milestone 1 only initializes GitQuack configuration by creating `.gitquack` in a repository root. It does not install Git hooks, inspect Git commands, validate branch names, validate commit messages, intercept pushes, change Git configuration, collect telemetry, or make network requests.

## Development Installation

```bash
pnpm install
pnpm build
npm link

cd example-project
gitquack init
```

## Available Commands

```bash
gitquack hello
gitquack init
```

`gitquack hello` prints:

```text
🦆 GitQuack is ready.
```

`gitquack init` creates `.gitquack` in the current Git repository root when GitQuack has not already been initialized there.

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
