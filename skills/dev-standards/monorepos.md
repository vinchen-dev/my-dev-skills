# Monorepos

Read by `dev-standards` when the repo has multiple packages with different stacks or commands.

- Root AGENTS.md holds shared rules and commands that run everything from the root.
- Packages whose commands or rules differ get their own AGENTS.md, with a CLAUDE.md containing `@AGENTS.md` next to it. The post-edit formatter hook looks for the nearest AGENTS.md above the edited file, so a package-level `format-one` is picked up automatically. That nearest file is final: write `none` there only to switch formatting off below the package, and copy the root's `format-one` into a package that shares it.
- docs/standards.md holds shared rules, plus a `## Package: <name>` section for each package's differences.
