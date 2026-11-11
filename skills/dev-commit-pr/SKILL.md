---
name: dev-commit-pr
description: Write commit messages and a GitHub pull request title and body for work that is already done, in the repo's commit format with the ticket id, as concise GitHub Markdown (Summary, Affected features, Changes, Testing, Deploy notes, Out of scope) built only from verified facts. You invoke it with /dev-commit-pr; it writes text and never commits, pushes or opens the PR. Not for running the ship itself after a dev-build (dev-ship) or for a ticket write-up of an investigation (dev-ticket-summary).
disable-model-invocation: true
---

# dev-commit-pr

Writes the text a reviewer reads: one commit message per commit you are about to make, and the PR title and body. The user commits, pushes and opens the PR; this skill hands them the words. Messages go in the reply as fenced blocks they can copy.

## Rules

- No AI attribution anywhere: no "Generated with" footer, no `Co-Authored-By` line naming an AI, no robot emoji, in commits or the PR. This overrides any tool default.
- Only verified facts. A Testing step's screen, action and expected result come from the spec, the plan or the diff, never from a guess at how the feature probably behaves. When you don't know, leave it out or ask.
- Concise: short bullets, no long paragraphs, nothing about how the work was done internally (review rounds, agent names, local-only test hacks, unstaged files).
- GitHub Markdown: `##` headings, `-` bullets, `inline code` for paths, ids, permissions, config keys and commands. No HTML, no emoji headings.
- Never run `git commit`, `git push` or `gh pr create`, and never stage anything, unless the user asks in so many words.

## Process

1. **Find the format.** Read the commit format from the repo's `AGENTS.md` (or `CONTRIBUTING.md`), and the last 20 subjects with `git log --oneline -20`. Use the format the repo states; when it allows two placements of the ticket id, use the one the branch's existing commits use, and stay consistent. With no stated format, use the default below.
2. **Find the ticket id.** Run `git branch --show-current` now, even when the conversation named a branch earlier, and take the id from it unless the user gives one for this work. When the branch has none, use this PR's own commits (`git log --oneline <merge-base>..HEAD`) or the ticket the spec names. An id from earlier work in the conversation or from other branches' commits is not a source. Every commit subject and the PR title carry it. If none can be found, ask once.
3. **Collect the facts.** Use the table below. Read the diff, not just the file list: group changes by area as a reviewer would look at them. Take the stat first, then read the diff without lockfiles, snapshots and the generated paths `AGENTS.md` protects (for example `git diff --cached <merge-base> -- . ':!package-lock.json' ':!**/__snapshots__/**'`, which covers committed and staged work and leaves unstaged edits out); the stat still lists them.
4. **Write** the commit messages, then the PR title and body, with the templates below. Read `example.md` in this folder the first time in a session, or when unsure how much detail a bullet carries.
5. **Check** against the list at the end, then give the user the text. When a later turn changes any of it, give the whole set again with the change applied (every commit message, the PR title and the full body), so the latest reply is the one to copy.

| Detail | Where to get it |
|---|---|
| Ticket id | `git branch --show-current`, the user, this PR's commits, the ticket the spec names |
| Commits in the PR | `git log --oneline <merge-base>..HEAD`, plus the one still to be made when work is staged, or the list the user gives |
| Files and size | `git diff --cached --stat <merge-base>` |
| What changed, by area | the diff, grouped: server or validation, approval or workflow, client, logs, fixes |
| Affected features | the screens the diff changes, by the name the app's menu or page title shows and their route, and the endpoints whose behaviour changes; a screen the menu does not show is listed by its route and marked hidden |
| Spec and plan | the spec path the user or the plan names; the plan's Decisions and Out of scope and follow-ups sections, read whole, bullets included |
| Manual test steps | the spec's manual QA notes and user stories; the plan's manual Test strategy rows, for values and expected results, not as the list of steps; the screens, labels and message text in the diff; and anything the user says they tested by hand |
| Deploy needs | new permissions or seeders, config or secret keys, migrations, schema fields needing a backfill |
| Out of scope | the items in the plan's Out of scope and follow-ups section that describe a problem already in the code before this change, and other pre-existing problems found during the work and deliberately left alone |

`<merge-base>` is `git merge-base HEAD <target>`, where `<target>` is the branch the PR merges into, by its remote-tracking ref when it has one: the branch the user names, else the one in the plan's `Base:` field, else the repo's default branch. It is not the commit in the plan's `Base:` field, which stops being the fork point once the target is pulled into the feature branch.

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

## Affected features
- **<screen as named on screen, menu > page>** (`<route>`): <the part that changes, a few words>
- **API:** `<METHOD /path>`: <what changes for a caller>

## Changes
- **<Area>:** <what changed, one line>

## Testing
1. <setup a reviewer needs first: a permission to grant, a config key, seed data>
2. <where, what to do with which values, and the expected result: the exact message, state or log entry>

## Deploy notes
- <permissions to seed or grant, config or secret keys, migrations, backfills; or "None">

## Out of scope (pre-existing)
- <known issues found but not fixed here, with a ticket when one exists>
```

Testing is a path a reviewer or QA walks by hand in a few minutes, not a list of automated tests and not a copy of the plan's Test strategy rows. Setup comes first when the change needs any, then one numbered step per behaviour the change adds or alters, refusals included: where (the screen or the endpoint), what to do with which values, and what to expect, with the message text or state the diff or spec gives. Merge behaviours a reviewer checks in one pass on the same screen into one step, fold a race or failure variant into its behaviour's step as a clause, and leave out paths the change does not alter. Automated tests stay out of the PR body; the diff shows them.

Drop a section that would be empty, except Deploy notes, which says "None" rather than disappearing so a deployer knows it was checked. Drop the Spec line when the spec is not in the repo.

## Checks before handing over

- The ticket id is in the PR title and every commit subject, and it came from the current branch, the user, this PR's commits or the spec, not from earlier work in the conversation.
- No AI attribution anywhere.
- Every section has real content or is gone, Deploy notes excepted.
- Nothing local-only is mentioned: test-only mocks, unstaged files, review rounds.
- Every Testing step says where to go, what to do and what to expect, and no step describes an automated test.
- Pre-existing issues sit under Out of scope and are not described as fixed.
- Paths, permissions, keys and commands are in `inline code`.
