---
name: dev-build
description: Implement an approved plan end to end. Runs each plan task with tdd, then verify and code review in fresh contexts, fixes must-fix findings, and loops until the change passes or the round limit is reached, then reports. Use when the user asks to build or implement a planned feature, or to run the full implement-verify-review loop. Requires a spec and an approved plan; for writing code without the loop, use tdd or implement directly. Not for committing the final result or opening the PR (dev-ship).
---

# dev-build

Runs the loop:

```
implement (once) → verify ─fail→ fix ─┐
                       │ pass         │
                  code-review ─must-fix→ fix ─┘ (back to verify)
                       │ clean
                    report
```

Implementation happens once. After that, every fix goes back through verify before another review, because a fix for a review finding can break behavior just like any other change.

## Preflight

Before writing any code:

1. Find the spec and plan. The spec lives in the repo's issue tracker as configured in `docs/agents/issue-tracker.md` (a `.scratch/<feature-slug>/spec.md` file, or a GitHub/GitLab issue); the plan is `.scratch/<feature-slug>/plan.md`. If `docs/agents/issue-tracker.md` is missing, stop and tell the user to run Matt's `setup-matt-pocock-skills` first. If the plan's status is neither `approved` nor `in progress`, show its summary and ask the user to approve it first.
2. Check the pieces you depend on: Matt Pocock's `tdd` and `code-review` skills (they may be namespaced by plugin name, for example `mattpocock-skills:tdd`; use whatever name resolves), the `dev-verifier` and `dev-reviewer` agents, and the `Commands` section of `AGENTS.md`. If a skill is missing, stop and tell the user how to install it. If `AGENTS.md` has no `Commands` section or `docs/standards.md` does not exist, stop and tell the user to run `dev-standards` first: the verifier takes its gates from that section and the reviewer judges against that file, and without them both improvise. If the agents are missing, use the fallback below.
3. Record the base. If the plan's `Base:` field already holds a commit, this is a resumed build: keep that base, keep the `WIP commits:` answer already in the plan instead of asking again, skip tasks whose checkboxes are ticked, and continue from the first unticked one, reading any `Done so far:` line under it before starting. Otherwise run `git rev-parse HEAD` and write it into the plan's `Base:` field (for example `Base: main @ 3f2a9c1`), so verify and review in any later session diff against the same point. If the working tree is dirty on a fresh start, ask whether those changes belong to this feature; if they don't, ask the user to stash or commit them before you continue. If you are on the default branch or on any shared branch, meaning one with an upstream such as a release branch, create a feature branch from it named after the feature slug, or a name the user prefers, and do the rest of the build there. Then ask the user once whether dev-build may make work-in-progress commits on that branch before each review pass, and write the answer into the plan's `WIP commits:` field as `allowed` or `declined`, so a resumed build and `dev-ship` know without asking again. `code-review` only sees committed work, so if the user declines, dev-build skips `code-review` and the `dev-reviewer` covers all seven axes instead. Never commit without that answer.
4. Set the plan's status to `in progress`.

## Boundaries

dev-build writes code and tests for the plan's tasks, its own `build-report.md`, and nothing else except these bookkeeping fields:

- In `plan.md`: the `Status:`, `Base:` and `WIP commits:` header fields, each task's checkbox, and a `Done so far:` line under a task a scoped build only partly covered. Never the summary, the approach, the Test strategy rows, or a task's Files, Test, Done when or Depends on lines. The plan is the approved contract. If it turns out to be wrong, stop and tell the user, who re-runs `dev-plan` or edits it themselves.
- In the spec: nothing, with one exception. When a task cannot proceed because the spec is silent or says two things, ask the user, then record their answer by appending to the spec under a `## Decisions during build` heading, dated, with the question and the answer, and add the same line to the plan's Decisions. Never rewrite or delete existing spec text. When the spec is an issue rather than a file, post the decision as a comment on it instead.
- Never `AGENTS.md`, `CLAUDE.md` or `docs/standards.md`; those belong to `dev-standards`. Never `verify-report.md`; the verifier writes it.

## Phase 1: Implement

Work through the plan's tasks in order, one at a time. For each task, run Matt's `tdd` skill with the task's files, its `Test:` line and its done condition, and tell it that the plan's Test strategy rows and the task's `Test:` line are the pre-agreed seams; a seam the plan doesn't name is a decision to bring to the user. Run the `typecheck` command and `test-one` while iterating, and the full `test` command once all tasks are done. Tick each task's checkbox as it completes. Don't run `code-review` or commit here; both happen in Phase 3. If anything needs a decision, bring the question to the user rather than deciding for them, and when the decision fills a gap in the spec, record it as the Boundaries section says.

dev-build works the plan's tasks, never tickets. If Matt's `to-tickets` ran, its tickets are slices for people and the tracker, not an input here. When the user wants only part of the plan built, take the scope as task numbers or a task group name from the plan, name that scope in the report, and leave a task the scope only partly covers unticked with a `Done so far:` line under it saying what was completed and what remains, so a resumed build continues from that line instead of restarting the task.

Matt's `implement` skill is marked for human invocation only, so dev-build runs `tdd` directly instead of calling it.

## Phase 2: Verify

Delegate to the `dev-verifier` agent with the spec path, plan path, base, and the build scope if there is one, and nothing else. Don't pass your own description of the code, and never an instruction to skip, shorten or trust an earlier run of any gate; the point is that it judges the code cold, and a slow full suite is the cost of the loop.

- `FAIL` with failures caused by the change: fix round.
- `INCOMPLETE` (unverified or out-of-scope criteria only): note them for the report and continue to review.
- `PASS`: continue to review.

## Phase 3: Review

If the user allowed work-in-progress commits in preflight, first commit everything on the branch chosen in preflight as `wip: <feature> round <n>`, with no Co-Authored-By trailer or any other attribution, never on the default branch or a shared branch. `code-review` diffs `<base>...HEAD`, so it sees committed work only; `dev-ship` squashes these commits later. If the user declined, skip pass 1. Then two passes, both judging the code cold:

1. Run Matt's `code-review` skill yourself, from this context, with the plan's base commit as the fixed point and the spec as the originating spec. Run it from here rather than inside another agent so its two reports land in the same context that runs the fix rounds. Read its two reports: documented-standard breaches and Spec failures are must-fix; baseline smells and judgement calls are suggestions.
2. Delegate to the `dev-reviewer` agent with the spec and plan paths, telling it whether `code-review` ran. It gives a dedicated second look at tool output, performance and scalability, structure and naming, test quality, security, and reliability.

- Any must-fix from either pass, or `CHANGES REQUIRED` from the dev-reviewer: fix round, then back to Phase 2.
- Otherwise: report.

## Fix rounds

- Fix only must-fix findings and verify failures. Suggestions are collected for the report; they aren't fixed here, or the loop could polish forever.
- A path the change leaves unvalidated or unapproved where the spec requires either is must-fix now, whatever task or ticket owns the full fix. Close it in this round, with a guard if the real fix belongs to a later task, and say so in the report.
- Make the smallest change that resolves each finding. Don't refactor beyond it.
- When a fix changes behavior, update the tests with it.
- If a finding contradicts the spec or plan, or looks wrong, don't fix it. Record it as disputed and let the user decide in the report. If it blocks progress, stop and ask now.
- Use the `test-one` command while iterating; the dev-verifier runs the full suite.

Round limit: three fix rounds by default, or whatever the user set. On reaching it, stop and report what's still failing. Repeated failures usually mean the spec or plan has a gap, and that needs the user, not another attempt. Also stop if the same finding comes back twice in a row after being fixed.

## Fallback without agents

If the `dev-verifier` or `dev-reviewer` agents aren't available (for example in a tool without subagents), do the same work inline as separate steps: run the `dev-verify` skill, then `code-review` if you were allowed to commit, then the seven review axes as a checklist: 1 correctness against the spec and plan, 2 tool output (new lint or typecheck errors), 3 performance, scalability and resources, 4 structure and naming, 5 tests, 6 security, 7 reliability. Cover axes 2 to 7 when `code-review` ran and all seven when it didn't. The full definitions are in this plugin's `agents/dev-reviewer.md`, which Codex installs don't include, so the names are listed here. Say in the report that independence was reduced because the same context wrote and checked the code.

## Report

When the loop ends, set the plan's status (`done`, or leave `in progress` if stopped early), write the report below to `build-report.md` next to the plan, and give the user the same text:

```
# Build report: <feature>
Result: DONE | STOPPED (round limit) | STOPPED (needs decision)
Scope: <whole plan, or the task numbers or group built>
Rounds: <n> fix rounds
Code-review: ran | skipped (work-in-progress commits declined)
Gates: <from the last verify>
Criteria: <n> passed, <n> failed, <n> unverified, <n> out of scope

## Resolved must-fix findings
- <one line each>

## Suggestions for you to decide
- <from code-review and the dev-reviewer, one line each>

## Disputed
- <finding> — <why it wasn't applied>

## Still open
- <failures, or criteria still unverified>

## Files changed
- <path> — <what changed>

Next: <e.g. review the suggestions, then run dev-ship to squash the work-in-progress commits and open a PR>
```

Commit only the work-in-progress commits the user allowed in preflight, on the branch chosen there, with no attribution trailers or footers. Never push, and never commit on the default branch or a shared branch.
