---
name: dev-verify
description: Check that implemented code does what the spec says. Runs the repo's build, typecheck, lint, test and e2e commands from AGENTS.md, then proves each acceptance criterion in the spec with evidence and writes verify-report.md (passed, failed or unverified per criterion). Use after implementation and before code review, when the user asks to verify, validate or check a feature against its spec, or as the verify step of dev-build. Not a code-quality review (code-review), not a debugging tool (diagnosing-bugs), and not the bundled Claude Code verify skill, which launches the app instead of checking a spec.
---

# dev-verify

Answers one question: does the code do what the spec says? It produces evidence per acceptance criterion, not opinions about code quality. That's what makes its report useful: `dev-build` acts on failures, and the user can see exactly what was proven and how.

## Inputs

- The plan at `.scratch/<feature-slug>/plan.md`, and the spec its `Spec:` field points to (a local `spec.md` or an issue, fetched via `docs/agents/issue-tracker.md`). The plan's Test strategy table lists the acceptance criteria, numbered, and says how each should be proven. Read the spec for context and for drift, not for the list of criteria.
- `AGENTS.md` for the commands
- `docs/standards.md` for test conventions, when writing tests
- The change itself: `git diff <base>...HEAD` plus uncommitted changes. `<base>` is the commit in the plan's `Base:` field, written there by `dev-build`. If the field holds only a branch name, use that branch's merge base; if it's empty, ask the caller.

## Boundaries

- You may add or edit **test files only**. Never touch implementation code. If a fix looks obvious, describe it in the report.
- Never loosen or delete a test to make it pass.
- Never mark a criterion passed without evidence you actually observed.

## Workflow

### 1. Run the gates

Run, in order, the `build`, `typecheck`, `lint` and `test` commands from `AGENTS.md`, and `e2e` if it exists and its environment is available. Run all of them even if an early one fails, so the report is complete.

If tests fail, separate failures that involve changed files from failures that don't. Unrelated failures are likely pre-existing; mark them as such with your reason (for example, the test hasn't been touched and covers code the change doesn't reach). Don't try to fix them.

### 2. Prove each acceptance criterion

Go through the rows of the plan's Test strategy table one by one, keeping the plan's numbering:

- **Automated test exists and passes**: record its name and path.
- **No test exists but one is possible**: write it at the level and location the plan row gives, following the repo's conventions, then run it and record the result. Use the `test-one` command to run single files while iterating; run the full suite once at the end.
- **Test exists but fails**: record what was expected, what happened, the test name, and how to reproduce.
- **Only verifiable manually, or the test can't run here** (for example an e2e suite whose environment is down): do the check yourself if you can (run the command, call the endpoint, inspect the output) and record what you did and saw. If you can't, mark it unverified and say what's needed.

### 3. Check for drift

Note behavior that was implemented but isn't in the spec, and spec items with no corresponding implementation. Both are findings, even when the extra work looks useful.

### 4. Write the report

Fill `report-template.md` in this skill folder and save it as `.scratch/<feature-slug>/verify-report.md`, next to the plan. Set the result:

- `PASS`: every gate that ran passes, ignoring failures marked pre-existing in step 1, and every criterion passed. A gate recorded as `none` or `skipped` doesn't block `PASS`; say why in its Notes.
- `FAIL`: any gate fails because of the change, or any criterion failed.
- `INCOMPLETE`: nothing failed, but at least one criterion is unverified.

Then give the caller a short summary: the result line, counts of passed, failed and unverified, and one line per failure.
