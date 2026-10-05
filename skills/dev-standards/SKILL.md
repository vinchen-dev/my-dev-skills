---
name: dev-standards
description: Set up or refresh a repository's agent rules and coding standards. Generates AGENTS.md (verified commands, protected paths, workflow rules), makes CLAUDE.md import it, and generates docs/standards.md (naming, structure, error handling, testing, performance, security) from evidence in the codebase. Use when onboarding a repo to the dev workflow, when the user asks to create or update coding standards, project rules, AGENTS.md or CLAUDE.md, or when dev-build, dev-verify or code-review cannot find the repo's commands or standards. Re-run after major changes to the stack or structure. Not for the issue-tracker setup (setup-matt-pocock-skills) or for planning a feature (dev-plan).
---

# dev-standards

Creates the two per-repo files the rest of the workflow depends on. Every other skill is stack-agnostic, so this is where the repo's specifics get captured, and a wrong command or an invented rule here carries into every build and review. Evidence and verification matter more than speed.

- **AGENTS.md** — how an agent must behave in this repo: verified commands, protected paths, workflow rules. It is loaded into every session, so it stays short. CLAUDE.md contains only `@AGENTS.md`, so Claude Code and Codex read the same source.
- **docs/standards.md** — what good code looks like here. Read on demand by `dev-plan`, `implement`, `dev-verify` and `code-review`.

## Workflow

### 1. Check current state

- Check each output file on its own. If AGENTS.md or docs/standards.md exists, follow **Update mode** below for that file. Generate a missing file per step 6 and present it as an addition in the same proposal.
- If CLAUDE.md exists with real content (more than `@AGENTS.md`), plan to move that content into AGENTS.md. Confirm with the user before moving anything.
- Check whether Matt Pocock's per-repo setup has run: it creates `docs/agents/issue-tracker.md` and `docs/agents/domain.md` (plus `docs/agents/triage-labels.md` when his `triage` skill is installed) and adds an `## Agent skills` block to `CLAUDE.md` if that exists, otherwise to `AGENTS.md`. Because it edits `CLAUDE.md` whenever one exists, the right order on a fresh repo is his `setup-matt-pocock-skills` first (answering `AGENTS.md` when it asks which file to create), then this skill. If neither file exists yet and his setup hasn't run, say so and offer to stop so the user can run it first. If it has run, preserve its block unchanged.
- Matt's `code-review` finds standards by looking for files that document how code should be written (it names `CODING_STANDARDS.md` and `CONTRIBUTING.md` as examples). The `## Standards` pointer in `AGENTS.md` is what makes `docs/standards.md` discoverable to it.

### 2. Gather evidence

Delegate the scan to the `dev-explorer` agent in **standards mode** if it is available. Otherwise do the scan yourself, covering:

- **Manifests** (package.json, pyproject.toml, go.mod, Cargo.toml, composer.json, Gemfile, *.csproj, etc.): languages, frameworks, versions, scripts.
- **Tool configs** (linters, formatters, type checker or compiler settings, .editorconfig): what is already enforced automatically.
- **CI config** (.github/workflows, .gitlab-ci.yml, etc.): the commands that actually run. Trust these over README instructions.
- **Written conventions**: README, CONTRIBUTING, ADRs, glossary or domain docs, existing agent instruction files.
- **Code sample**: representative files from each main folder, weighted toward recently changed files. Note naming, folder structure, error handling, test location and style, import patterns — with counts, not impressions.
- **Git history**: commit message format, and whether recent code follows different conventions from older code.
- **Repo shape**: single app or monorepo, plus generated, vendored and migration paths.

### 3. Verify commands

Find candidates for these keys: `test`, `test-one` (run a single test file), `lint`, `typecheck`, `build`, `e2e`, `format`, `format-one` (format a single file; the plugin's post-edit hook uses it). Then run each one.

- Never run commands that deploy, publish, release, migrate or seed databases, delete data, or push to git.
- For `format` and `format-one`, run only a check or dry-run variant (for example `--check` in place of `--write`), but record the formatting command itself, since the post-edit hook runs it to format files. Never run the variant that rewrites files. If no check variant exists, record the command and mark it unverified.
- For `test-one` and `format-one`, put one existing file in place of `<file>` when verifying: a test file the full suite already runs, or a small source file.
- Skip `e2e` if it needs services that aren't running, and mark it unverified.
- If tests run but some fail, the command is correct and the failures are a pre-existing baseline. Record the failure count for the summary; don't try to fix them.
- If a command fails because of the environment (missing env vars, services down, dependencies not installed), report it and ask. Don't guess an alternative command.

### 4. Decide conventions

When sources disagree, trust them in this order:

1. Conventions the team wrote down
2. What tooling enforces
3. The dominant pattern in current code, weighting recent files over old ones
4. The stack pack in `stacks/` for the detected stack, if one exists (stack packs are optional; see `stacks/README.md`)
5. Universal defaults in `template.md`

Write a rule only if it traces back to one of these sources or to an answer from the user. A short section is better than one padded with plausible-sounding rules, because every rule here gets enforced in every review. Don't restate what the linter or formatter already enforces either: the standards file names the tool as the authority and covers what tools can't check.

**Size limits.** If the linter or formatter already sets line, file or function limits, point to them. Otherwise use the dev-explorer's size measurements (median, 90th percentile, largest files) to propose a soft and a hard file limit as a question, and if the linter supports such a rule, offer to add it to the linter config so the limit is enforced automatically. Limits always apply to new and changed code only.

### 5. Ask the user, in one batch

Collect your questions and ask them in a single message, at most seven. For each question, state what you found with evidence (for example, "9 of 14 service files throw errors; 5 return result objects"), the options, and your recommended default.

Ask when:
- the code is split between two patterns with no clear majority
- existing code contradicts a template or stack-pack default
- legacy and recent code differ, to confirm which is the target going forward

Unless already documented, always ask:
- the expected scale (users, data volume), which sets how strict the performance section is
- areas that are risky or off-limits for agents
- team conventions that aren't visible in the code

If the user says to use your defaults, apply your recommendations and continue.

### 6. Write the files

For a monorepo, read `monorepos.md` in this skill's folder first; it says how the files split across packages.

**AGENTS.md** — use this structure. Other skills read the Commands section by its exact keys, so keep them as written and use `none` when a command doesn't exist. In a package-level AGENTS.md, `none` for `format-one` switches formatting off below that package (see `monorepos.md`).

```markdown
# Agent rules

<!-- Generated by dev-standards. Edit freely. Re-runs re-verify the commands and propose changes; nothing is applied without your approval. -->

## Project
<One or two lines: what this is, main stack, layout if monorepo.>

## Commands
- test: `<command>`
- test-one: `<command with <file> placeholder>`
- lint: `<command>`
- typecheck: `<command>`
- build: `<command>`
- e2e: `<command>`
- format: `<command>`
- format-one: `<command with <file> placeholder>`

## Protected paths
- `<path>` — <reason, e.g. generated by codegen; edit the source schema instead>

## Workflow rules
- <e.g. Ask before adding a dependency.>
- <e.g. Never modify existing migrations; create a new one.>
- <e.g. Commit format: Conventional Commits.>

## Standards
Coding standards live in docs/standards.md. Read them before writing or reviewing code.
```

**CLAUDE.md** — exactly `@AGENTS.md`, plus any Claude-specific notes the user chose to keep below it.

**docs/standards.md** — start from `template.md`: fill the placeholders, merge stack-pack rules into the matching sections, adjust everything to the repo evidence and the user's answers, and remove the template's instruction comments. End each generated rule, and each prose line that holds repo-specific content (the layout description, the expected scale), with a source tag so update mode can tell generated lines from ones the user wrote:

```markdown
- Must: Handlers call services, never the database directly. <!-- src: code 11/12 handlers -->
- Prefer: Early returns over nested conditionals. <!-- src: default -->
```

Tag values: `default`, `stack`, a config file name, `code <count>`, a doc name, or `user`.

### 7. Summarize

Report to the user:
- files created or changed
- a commands table with key, command and status (works / fails / unverified)
- the main decisions and where each came from
- open items: failed or unverified commands, pre-existing test failures, whether `setup-matt-pocock-skills` still needs to run, and a reminder to confirm that `code-review` picks up `docs/standards.md` the first time it runs

Ask the user to review both files once. They are the only per-repo input to the whole workflow.

## Update mode

When AGENTS.md or docs/standards.md already exists. On a fresh repo this is the normal first run, because Matt's setup has already created AGENTS.md.

1. Re-gather evidence and re-verify commands (steps 2 and 3).
2. Generate any output file that doesn't exist yet per step 6. It goes into the proposal below as an addition.
3. Compare the results against each existing file.
   - AGENTS.md carries no tags. Propose a change for any line the evidence contradicts, and keep everything else as it is, including Matt's `## Agent skills` block.
   - In docs/standards.md, lines without a `src` tag or tagged `src: user` were written or decided by the user: never change or remove them. If evidence contradicts one, raise it as a question instead.
4. Present proposed changes grouped as additions, changes and removals, each with its reason. Put broken or changed commands first.
5. Apply only the changes the user approves.

## Writing good rules

- **Checkable.** A reviewer should be able to point at a line of code and say whether it breaks the rule. "Keep code clean" fails this test; "Handlers must not query the database directly; go through `src/repositories/`" passes.
- **Specific to this repo.** Name real paths and point to real example files.
- **Must vs Prefer.** Code review treats `Must` rules as must-fix and `Prefer` rules as suggestions. Reserve `Must` for things that cause bugs, security problems or real maintenance cost.
- **Short.** Aim for a file a person would actually read: under about 150 lines for most repos.
