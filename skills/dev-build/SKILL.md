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

The first verify and review cover the whole change and must surface every issue; nothing is narrowed there. From the second round on, the verifier and reviewer cover only what the last fix round touched, as the plan's `Fix rounds:` line records, with the gates still run in full. A problem the first cycle missed is not found by a later round, so the first cycle never cuts corners.

## Preflight

Before writing any code:

1. Find the spec and plan. The spec lives in the repo's issue tracker as configured in `docs/agents/issue-tracker.md` (a `.scratch/<feature-slug>/spec.md` file, or a GitHub/GitLab issue); the plan is `.scratch/<feature-slug>/plan.md`. If `docs/agents/issue-tracker.md` is missing, stop and tell the user to run Matt's `setup-matt-pocock-skills` first. If there is no plan, stop and tell the user to run `dev-plan`: never build from the spec, an issue or a ticket directly, however small the change looks. If the plan's status is neither `approved` nor `in progress`, show its summary and ask the user to approve it first. A ticket is the normal way to scope a build. A ticket from `to-tickets` describes behaviour (What to build, acceptance criteria) and never names plan tasks; on a real tracker its `Parent` section leads to the spec and so to the plan, and when that link is missing, ask. Match the ticket's behaviour to the plan's tasks and Test strategy rows, then ask the user once, showing the mapping as tasks and rows together with every ticket item no task or row covers: they confirm or correct the mapping, and for the unmatched items either add rows to the plan (or re-run `dev-plan`) or drop them from this build; nothing is built from the ticket alone. Write the confirmed mapping into the plan's `Tickets:` header line, for example `Tickets: 03 → tasks 5, 6, 7 (rows 18, 23), 8; 05 → task 3 (rows 12-15), 4 (row 28)`, reuse it on a resumed build or a later ticket, take it as the scope, and keep the ticket's name for the report. What to build and how to prove it comes from the plan; the ticket does not add or change work.
2. Check the pieces you depend on: Matt Pocock's `tdd` and `code-review` skills (they may be namespaced by plugin name, for example `mattpocock-skills:tdd`; use whatever name resolves), the `dev-verifier` and `dev-reviewer` agents, and the `Commands` section of `AGENTS.md`, which in a monorepo means the root file plus the package files `dev-standards` writes. If a skill is missing, stop and tell the user how to install it. If `AGENTS.md` has no `Commands` section or `docs/standards.md` does not exist, stop and tell the user to run `dev-standards` first: the verifier takes its gates from that section and the reviewer judges against that file, and without them both improvise. If the agents are missing, use the fallback below.
3. Record the base. If the plan's `Base:` field already holds a commit, this is a resumed build: keep that base, keep the `WIP commits:` answer already in the plan instead of asking again, keep the `Fix rounds:` count and the `Tickets:` mapping, skip tasks whose checkboxes are ticked, and continue from the first unticked one, reading any `Done so far:` line under it before starting. Otherwise run `git rev-parse HEAD` and write it into the plan's `Base:` field (for example `Base: main @ 3f2a9c1`), so verify and review in any later session diff against the same point. If the working tree is dirty on a fresh start, ask whether those changes belong to this feature; if they don't, ask the user to stash or commit them before you continue. If you are on the default branch or on any shared branch, meaning one with an upstream such as a release branch, create a feature branch from it named after the feature slug, or a name the user prefers, and do the rest of the build there. Then ask the user once whether dev-build may make work-in-progress commits on that branch before each review pass, and write the answer into the plan's `WIP commits:` field as `allowed` or `declined`, so a resumed build and `dev-ship` know without asking again. `code-review` only sees committed work, so if the user declines, dev-build skips `code-review` and the `dev-reviewer` covers all seven axes instead. Never commit without that answer.
4. Set the plan's status to `in progress`.

## Boundaries

dev-build writes code and tests for the plan's tasks, its own `build-report.md`, and nothing else except these bookkeeping fields:

- In `plan.md`: the `Status:`, `Base:`, `WIP commits:`, `Fix rounds:` and `Tickets:` header fields, each task's checkbox, a `Done so far:` line under a task a scoped build only partly covered, and a dated line appended under Decisions only in the spec case below. Never the summary, the approach, the Test strategy rows, or a task's Files, Test, Done when or Depends on lines, and nothing at all during verify, review or a fix round beyond those fields. The plan is the approved contract. If it turns out to be wrong, stop and tell the user, who re-runs `dev-plan` or edits it themselves.
- In the spec: nothing, with one exception. When a task cannot proceed because the spec is silent or says two things, ask the user, then record their answer by appending to the spec under a `## Decisions during build` heading, dated, with the question and the answer, and add the same line to the plan's Decisions; record a behaviour the user adds mid-build the same way. Never rewrite or delete existing spec text. When the spec is an issue rather than a file, post the decision as a comment on it instead.
- Never `AGENTS.md`, `CLAUDE.md` or `docs/standards.md`; those belong to `dev-standards`. Never `verify-report.md`; the verifier writes it.

## Phase 1: Implement

Work through the plan's tasks in order, one at a time. For each task, run Matt's `tdd` skill with the task's files, its `Test:` line and its done condition, and tell it that the plan's Test strategy rows and the task's `Test:` line are the pre-agreed seams, that a seam the plan doesn't name is a decision to bring to the user, and that new tests follow the testing rules in `docs/standards.md` over neighbouring files. Run the `typecheck` command and `test-one` while iterating, and the full `test` command once all tasks are done. Tick each task's checkbox as it completes. Don't run `code-review` or commit here; both happen in Phase 3. If anything needs a decision, bring the question to the user rather than deciding for them, and when the decision fills a gap in the spec, record it as the Boundaries section says.

dev-build builds the plan's tasks; when Matt's `to-tickets` ran, its tickets are the slices those tasks are built and shipped in. A ticket decides which tasks or rows a build covers and in what order, as the plan's `Tickets:` line records, and the plan decides what each one changes and how it is proven; the ticket's own checklist never adds work or criteria, and neither the ticket nor its checklist is passed to `tdd`, the verifier or the reviewer, which get task numbers. When the user wants only part of the plan built, take the scope as task numbers or a task group name from the plan, name that scope in the report, and leave a task the scope only partly covers unticked with a `Done so far:` line under it naming the Test strategy rows completed and the rows that remain, for example `Done so far: rows 20-21 (endpoint); remaining: rows 22-23 (CSV button)`, so a resumed build continues from that line and `dev-verify` knows which rows are out of scope.

When the user asks mid-build for a change no plan task covers, ask once whether it is part of this feature. If it is, it enters the way the Boundaries say: the user adds a task and its Test strategy row to the plan, or re-runs `dev-plan`, and you record the addition as a dated line under the spec's `## Decisions during build` and the plan's Decisions. Then build that task with `tdd`, append it to the plan's `Fix rounds:` line as `+ task <n> (your request)` with the files it changed, not counted, so the next verify covers its rows, and go back to Phase 2. It is not a fix round and does not change the count; mark its files `(your request)` under Files changed. If it is not part of this feature, say it belongs in a separate change and leave it out of this build.

Matt's `implement` skill is marked for human invocation only, so dev-build runs `tdd` directly instead of calling it.

## Phase 2: Verify

Delegate to the `dev-verifier` agent with the spec path, plan path, base, and the build scope if there is one, and nothing else. Don't pass your own description of the code, and never an instruction to skip, shorten or trust an earlier run of any gate; the point is that it judges the code cold, and a slow full suite is the cost of the loop. From the second round the verifier narrows itself to the rows and files the plan's `Fix rounds:` line records; you never narrow it in the brief.

- `FAIL` with failures caused by the change: fix round, after the round-limit and disputed checks in Fix rounds.
- `INCOMPLETE` (unverified or out-of-scope criteria, or a gate with no result): note them for the report and continue to review.
- `PASS`: continue to review.
- Whatever the result, read the summary's `Drift:` line and any note after it. A spec item reported as not implemented that a plan task covers is a verify failure: fix round, under the round limit. One no task covers is a plan gap: list it under Still open for the user. Every other drift item or note goes under Suggestions for you to decide. Never drop them.

## Phase 3: Review

If the user allowed work-in-progress commits in preflight, first commit everything on the branch chosen in preflight as `wip: <feature> round <n>`, with no Co-Authored-By trailer or any other attribution, never on the default branch or a shared branch. `code-review` diffs `<base>...HEAD`, so it sees committed work only; `dev-ship` squashes these commits later. If the user declined, skip pass 1. Then two passes, both judging the code cold:

1. Run Matt's `code-review` skill yourself, from this context, with the plan's base commit as the fixed point on the first pass and the previous round's `wip:` commit from the second pass on, and the spec as the originating spec. Run it from here rather than inside another agent so its two reports land in the same context that runs the fix rounds. Read its two reports: documented-standard breaches and Spec failures are must-fix; baseline smells and judgement calls are suggestions.
2. Delegate to the `dev-reviewer` agent with the spec path, plan path and the build scope if there is one, telling it whether `code-review` ran, and nothing else. On the first pass it reviews the whole change since the base; from the second round it narrows itself to the files the plan's `Fix rounds:` line records. Don't describe the code, name what to scrutinise, narrow it yourself, or list findings it must not raise: decisions it must respect are in the plan's Decisions section, and a must-fix that contradicts one is handled as disputed under Fix rounds. It gives a dedicated second look at tool output, performance and scalability, structure and naming, test quality, security, and reliability.

- Any must-fix from either pass, or `CHANGES REQUIRED` from the dev-reviewer: fix round, after the round-limit check in Fix rounds, then back to Phase 2.
- Otherwise: report.

## Fix rounds

- Fix only must-fix findings and verify failures. Suggestions are collected for the report; they aren't fixed here, or the loop could polish forever.
- A path the change leaves unvalidated or unapproved where the spec requires either, including an existing field a new rule now constrains, is must-fix now, whatever task or ticket owns the full fix. Close it in this round, with a guard if the real fix belongs to a later task, and say so in the report.
- Make the smallest change that resolves each finding. Don't refactor beyond it.
- When a fix changes behavior, update the tests with it.
- If a finding contradicts the spec or plan, or looks wrong, don't fix it. Record it as disputed and let the user decide in the report. If it blocks progress, stop and ask now. If a disputed finding comes with a failing test the verifier wrote, name that test in Disputed and ask the user whether to keep, skip or remove it. On later rounds, a verify FAIL whose only failures are findings already in Disputed does not start a fix round; carry them into the report.
- Use the `test-one` command from the nearest `AGENTS.md` above the file while iterating; the dev-verifier runs the full suite.

Round limit: three fix rounds by default, or whatever the user set. Before any fix round, whether it comes from a verify FAIL or a review must-fix, read the plan's `Fix rounds:` field, adding it as `Fix rounds: 0` if the plan predates it. If the limit is used up, or a failure you are about to fix has the same key as one fixed in each of the two previous rounds, don't start the round: set the result to `STOPPED (round limit)` and report what's still failing. Otherwise add one to the count and append this round's keys (a plan row number, a gate name, the heading of a Failures entry in `verify-report.md`, or the review finding's file and rule) before fixing, and the files the round changed once the fixes are done, for example `Fix rounds: 2 (1: row 14, files server/src/limits.js, server/test/limits.test.js; 2: merchantHandler.js unbounded query, files server/src/merchantHandler.js)`. The verifier and reviewer read that record to narrow the next round, so it must be complete before Phase 2 runs again. Repeated failures usually mean the spec or plan has a gap, and that needs the user, not another attempt. The count covers one build scope; reset it to 0 only when the user starts a new scope or explicitly grants more rounds.

## Fallback without agents

If the `dev-verifier` or `dev-reviewer` agents aren't available (for example in a tool without subagents), do the same work inline as separate steps: run the `dev-verify` skill, then `code-review` if you were allowed to commit, then the seven review axes as a checklist: 1 correctness against the spec and plan, 2 tool output (new lint or typecheck errors), 3 performance, scalability and resources, 4 structure and naming, 5 tests, 6 security, 7 reliability. Cover axes 2 to 7 when `code-review` ran and all seven when it didn't. The full definitions are in this plugin's `agents/dev-reviewer.md`, which Codex installs don't include, so the names are listed here. Say in the report that independence was reduced because the same context wrote and checked the code.

## Report

When the loop ends, set the plan's status (`done`, or leave `in progress` if stopped early), write the report below to `build-report.md` next to the plan, and give the user the same text. Keep every line and heading of the template, in order, and write `- none` under a heading with nothing to list; `dev-ship` reads Suggestions and Still open from it. A short lead-in may come before the block, but nothing replaces it; an item the template has no heading for goes under the nearest one.

```
# Build report: <feature>
Result: DONE | STOPPED (round limit) | STOPPED (needs decision)
Scope: <whole plan, or the ticket and the task numbers or rows it covers>
Rounds: <n> fix rounds (from the plan's `Fix rounds:`)
Code-review: ran | skipped (work-in-progress commits declined)
Gates: <from the last verify>
Criteria: <n> passed, <n> failed, <n> unverified, <n> out of scope

## Resolved must-fix findings
- <one line each>

## Suggestions for you to decide
- <from code-review, the dev-reviewer, and the last verify's drift line and notes, one line each>

## Disputed
- <finding> — <why it wasn't applied>

## Still open
- <failures, criteria still unverified, spec items no plan task covers, and, when the loop stopped before a review pass saw them, the files changed since the last review>

## Files changed
- <path> — <what changed>

Next: <e.g. review the suggestions, then run dev-ship to squash the work-in-progress commits and open a PR>
```

Commit only the work-in-progress commits the user allowed in preflight, on the branch chosen there, with no attribution trailers or footers. Never push, and never commit on the default branch or a shared branch.
