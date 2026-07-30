# GitQuack CLI Development Skill

Use this skill when adding or changing GitQuack CLI code.

GitQuack is a Node.js 22+ TypeScript ESM CLI built with Commander.js. Keep command implementations small, explicit, and easy to test.

CLI development conventions:

- Use strict TypeScript.
- Do not use `any`.
- Keep command registration separate enough to test without spawning a process when practical.
- Prefer simple functions over framework-style abstractions.
- Preserve cross-platform terminal behavior for Git Bash, PowerShell, macOS Terminal, Linux terminals, and the VS Code integrated terminal.
- Avoid network requests, databases, background services, and telemetry.

Current status: only the temporary `gitquack hello` command exists to verify the scaffold.
