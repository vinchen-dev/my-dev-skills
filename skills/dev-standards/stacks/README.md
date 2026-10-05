# Stack packs

Stack packs are optional. `dev-standards` works without them by learning conventions from the repo and using the universal defaults in `template.md`, one folder up. Add a pack only when the same stack-specific rules keep getting missed across repos.

## Format

One file per stack, named by stack id (`typescript.md`, `python.md`, `go.md`). Start with detection hints, then use the same section headings as `template.md`, including only the sections where the stack adds something.

```markdown
# Stack: TypeScript

Detect when: package.json with typescript in dependencies, or tsconfig.json exists.

## Naming
- Must: React components in PascalCase files, one component per file.

## Error handling
- Prefer: Narrow `unknown` in catch blocks before use.
```

## Guidelines

- Only rules specific to this stack. Anything that applies to every stack belongs in `template.md`.
- Only rules a linter can't enforce. If ESLint, Ruff or golangci-lint can check it, rely on the tool.
- Use Must and Prefer the same way as the template.
- Keep each pack under about 60 lines. Repo evidence and team decisions always override pack rules.
