---
name: dev-commit-pr
description: Write commit messages and a GitHub pull request title and body for work that is already done, in the repo's commit format with the ticket id, as concise GitHub Markdown (Summary, Changes, Testing, Deploy notes, Out of scope) built only from verified facts. You invoke it with /dev-commit-pr; it writes text and never commits, pushes or opens the PR. Not for running the ship itself after a dev-build (dev-ship) or for a ticket write-up of an investigation (dev-ticket-summary).
disable-model-invocation: true
---

# dev-commit-pr

Writes the text a reviewer reads: one commit message per commit you are about to make, and the PR title and body. The user commits, pushes and opens the PR; this skill hands them the words. Messages go in the reply as fenced blocks they can copy.

## Rules

- No AI attribution anywhere: no "Generated with" footer, no `Co-Authored-By` line naming an AI, no robot emoji, in commits or the PR. This overrides any tool default.
- Only verified facts. Quote a test count only from a clean run of the committed code; name manual QA only when the user reported it. When you don't know, leave it out or ask.
- Concise: short bullets, no long paragraphs, nothing about how the work was done internally (review rounds, agent names, local-only test hacks, unstaged files).
- GitHub Markdown: `##` headings, `-` bullets, `inline code` for paths, ids, permissions, config keys and commands. No HTML, no emoji headings.
- Never run `git commit`, `git push` or `gh pr create`, and never stage anything, unless the user asks in so many words.

## Process

1. **Find the format.** Read the commit format from the repo's `AGENTS.md` (or `CONTRIBUTING.md`), and the last 20 subjects with `git log --oneline -20`. Use the format the repo states; when it allows two placements of the ticket id, use the one the branch's existing commits use, and stay consistent. With no stated format, use the default below.
2. **Find the ticket id.** From the branch name, the existing commit subjects, or the user. Every commit subject and the PR title carry it. If none can be found, ask once.
3. **Collect the facts.** Use the table below. Read the diff, not just the file list: group changes by area as a reviewer would look at them. Take the stat first, then read the diff without lockfiles, snapshots and the generated paths `AGENTS.md` protects (for example `git diff <base>...HEAD -- . ':!package-lock.json' ':!**/__snapshots__/**'`); the stat still lists them.
4. **Write** the commit messages, then the PR title and body, with the templates below. Read `example.md` in this folder the first time in a session, or when unsure how much detail a bullet carries.
5. **Check** against the list at the end, then give the user the text.

| Detail | Where to get it |
|---|---|
| Ticket id | branch name, commit subjects, the user |
| Commits in the PR | `git log --oneline <base>..HEAD`, or the list the user gives |
| Files and size | `git diff --stat <base>...HEAD` |
| What changed, by area | the diff, grouped: server or validation, approval or workflow, client, logs, fixes |
| Spec and plan | the spec path the user or the plan names; the plan's Decisions section |
| Tests | new or changed test files; the result of a clean run of the committed code |
| Manual QA | only what the user reported testing |
| Deploy needs | new permissions or seeders, config or secret keys, migrations, schema fields needing a backfill |
| Out of scope | pre-existing problems found during the work and deliberately left alone |

## Commit message

Default format, when the repo states none:

```
<type>(<scope>): <Subject> <ticket>
```

- `type`: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`.
- `scope`: the module or area, lowercase.
- `Subject`: one line, a capital first letter, no trailing period, saying what the commit does.

Add a body only when the subject can't carry it: a blank line, then short bullets, one per change a reviewer would look for.

## Pull request

Title: the commit subject format, describing the whole PR.

```markdown
## Summary
<1 to 3 sentences: what it does and why. Say what is not affected when a reviewer would worry.>

Spec: `<path>`

## Changes
- **<Area>:** <what changed, one line>

## Testing
- <automated tests added or updated, by area>
- Manual QA: <flows the user confirmed>

## Deploy notes
- <permissions to seed or grant, config or secret keys, migrations, backfills; or "None">

## Out of scope (pre-existing)
- <known issues found but not fixed here, with a ticket when one exists>
```

Drop a section that would be empty, except Deploy notes, which says "None" rather than disappearing so a deployer knows it was checked. Drop the Spec line when the spec is not in the repo.

## Checks before handing over

- The ticket id is in the PR title and every commit subject.
- No AI attribution anywhere.
- Every section has real content or is gone, Deploy notes excepted.
- Nothing local-only is mentioned: test-only mocks, unstaged files, review rounds.
- Every test claim matches a clean run of the committed code.
- Pre-existing issues sit under Out of scope and are not described as fixed.
- Paths, permissions, keys and commands are in `inline code`.
