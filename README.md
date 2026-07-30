# GitQuack

Better Git habits, one quack at a time

GitQuack will become a local Git learning assistant for students, designed to run in common terminal environments such as Git Bash, PowerShell, macOS Terminal, Linux terminals, and the VS Code integrated terminal. The project currently contains Milestone 3: local configuration initialization, protected-branch direct-push warnings, and friendly branch-name guidance.

## Status

Milestone 3 initializes GitQuack configuration and installs repository-local Git hooks. It warns before direct pushes to configured protected branches and gives friendly guidance after checking out a branch whose name does not match the configured convention. It does not validate commit messages, wrap Git commands, change global Git configuration, collect telemetry, or make network requests.

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
gitquack check-branch
```

`gitquack hello` prints a short readiness message.

`gitquack init` creates `.gitquack` in the current Git repository root when GitQuack has not already been initialized there.

It also installs a GitQuack-managed hook directory:

```text
.gitquack-hooks/
`-- hooks/
    `-- pre-push
    `-- post-checkout
```

and sets the repository-local Git config:

```bash
git config --local core.hooksPath .gitquack-hooks/hooks
```

GitQuack does not modify global or system Git configuration.

## Direct Push Warning

When a push targets a protected branch such as `main`, GitQuack asks for confirmation before allowing the push:

```text
    __
 __( 0)<
 \___)
  " "   GITQUACK GUARD

[!] GitQuack noticed a protected branch push

Protected branch: "main"

You are about to push directly to protected branch "main".

In collaborative projects, changes are commonly pushed through a separate
working branch and reviewed before being merged.

A common workflow is:

  git switch -c feature/feature-name
  git push -u origin feature/feature-name

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

## Branch Naming Guidance

GitQuack uses Git's `post-checkout` hook to inspect the current branch after `git switch`, `git checkout`, `git switch -c`, or `git checkout -b` completes. Native Git does not provide a standard hook that runs before branch creation, so GitQuack warns after the branch exists.

By default, branch names should use:

```text
<type>/<short-kebab-case-description>
```

Valid examples:

```text
feature/student-login
feat/student-login
fix/navbar-overflow
hotfix/payment-timeout
docs/setup-instructions
refactor/auth-service
test/user-registration
chore/update-dependencies
```

Examples that trigger guidance:

```text
login
newBranch
feature/login_page
feature/LoginPage
random/test
fix/
feature/add login
```

Protected branches such as `main`, `master`, and `develop` do not trigger branch-name guidance.

When a branch does not match the convention, GitQuack explains the convention and suggests branch names. In an interactive terminal, GitQuack shows an arrow-key selector:

```text
    __
 __( 0)<
 \___)
  " "   GITQUACK GUARD

[!] GitQuack noticed something

The branch name "login" does not match this project's configured convention.

Recommended examples:

  feature/login
  feat/login
  fix/login

What would you like to do?

> Rename branch now
  Do not rename now
```

If you choose `Rename branch now`, GitQuack shows another selector with suggested names and then runs `git branch -m` for the selected name. Choosing `Do not rename now` leaves the branch unchanged.

Check the current branch manually with:

```bash
gitquack check-branch
```

Change allowed prefixes in `.gitquack`:

```json
{
  "branchNaming": {
    "allowedPrefixes": ["feature", "feat", "fix", "docs"],
    "separator": "/",
    "descriptionPattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
  }
}
```

Disable branch-name guidance with:

```json
{
  "branchNamingWarning": false
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
