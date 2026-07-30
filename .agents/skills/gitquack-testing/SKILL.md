# GitQuack Testing Skill

Use this skill when adding or changing GitQuack tests.

GitQuack uses Vitest. Tests should focus on observable CLI behavior and small units of command logic.

Testing conventions:

- Keep tests fast and deterministic.
- Avoid real Git repository mutation unless a future feature explicitly requires it.
- Prefer temporary directories for filesystem tests.
- Avoid network access.
- Test student-facing output carefully, including exact text when it matters.
- Add regression tests for fixes and behavior changes.

Current status: the test suite verifies CLI scaffold behavior and Milestone 1 initialization.
