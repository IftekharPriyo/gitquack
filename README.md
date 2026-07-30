# GitQuack

Better Git habits, one quack at a time

GitQuack will become a local Git learning assistant for students, designed to run in common terminal environments such as Git Bash, PowerShell, macOS Terminal, Linux terminals, and the VS Code integrated terminal. The project currently contains Milestone 2: local configuration initialization plus a protected-branch direct-push warning.

## Status

Milestone 2 initializes GitQuack configuration and installs a repository-local `pre-push` hook that warns before direct pushes to configured protected branches. It does not validate branch names, validate commit messages, wrap Git commands, change global Git configuration, collect telemetry, or make network requests.

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

`gitquack hello` prints a short readiness message.

`gitquack init` creates `.gitquack` in the current Git repository root when GitQuack has not already been initialized there.

It also installs a GitQuack-managed hook directory:

```text
.gitquack-hooks/
`-- hooks/
    `-- pre-push
```

and sets the repository-local Git config:

```bash
git config --local core.hooksPath .gitquack-hooks/hooks
```

GitQuack does not modify global or system Git configuration.

## Direct Push Warning

When a push targets a protected branch such as `main`, GitQuack asks for confirmation before allowing the push:

```text
      _
  __(.)<
 \___)
  " "   GITQUACK GUARD

[!] GitQuack noticed a protected branch push

Protected branch: "main"

You are about to push directly to protected branch "main".

In collaborative projects, changes are commonly pushed through a separate
working branch and reviewed before being merged.

A common workflow is:

  git switch -c feature/short-description
  git push -u origin feature/short-description

Continue pushing directly to "main"? [y/N]
```

Answer `y` or `yes` to continue. Answer `n`, `no`, or press Enter to cancel. Cancelled pushes do not delete or modify local commits or files.

Protected branches are configured in `.gitquack`:

```json
{
  "protectedBranches": ["main", "master", "develop"],
  "directPushWarning": true,
  "detailedExplanations": true
}
```

To disable the direct-push warning, set:

```json
{
  "directPushWarning": false
}
```

## Hook Limitations

If a repository already has a local `core.hooksPath` value that does not point to GitQuack, `gitquack init` stops and leaves the existing hook configuration untouched. Support for integrating with Husky, Lefthook, and custom hook managers will be added later.

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
