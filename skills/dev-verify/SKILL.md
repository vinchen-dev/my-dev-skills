---
name: dev-verify
description: Check that implemented code does what the spec says. Runs the repo's build, typecheck, lint, test and e2e commands from AGENTS.md, then proves each acceptance criterion in the spec with evidence and writes verify-report.md (passed, failed or unverified per criterion). Use after implementation and before code review, when the user asks to verify, validate or check a feature against its spec, or as the verify step of dev-build. Not a code-quality review (code-review), not a debugging tool (diagnosing-bugs), and not the bundled Claude Code verify skill, which launches the app instead of checking a spec.
---

# dev-verify

Answers one question: does the code do what the spec says? It produces evidence per acceptance criterion, not opinions about code quality. That's what makes its report useful: `dev-build` acts on failures, and the user can see exactly what was proven and how.

## Inputs

- The plan at `.scratch/<feature-slug>/plan.md`, and the spec its `Spec:` field points to (a local `spec.md` or an issue, fetched via `docs/agents/issue-tracker.md`). The plan's Test strategy table lists the acceptance criteria, numbered, and says how each should be proven. Read the spec for context and for drift, not for the list of criteria. Tickets scope a build but are not an input here; the scope arrives as task numbers. If a ticket or a tickets folder is passed anyway, judge against the plan and note the instruction in the report.
- `AGENTS.md` for the commands: the root file plus the nearest `AGENTS.md` above each changed file, so every package the change touches contributes its own commands, run from that package's folder. A `none` in one file doesn't cancel a command another file in that set provides.
- `docs/standards.md` for test conventions, when writing tests
- The change itself: `git diff <base>...HEAD` plus staged, unstaged and untracked files (`git status --porcelain` lists them; `git diff` never shows an untracked file). `<base>` is the commit in the plan's `Base:` field, written there by `dev-build`. If the field holds only a branch name, use that branch's merge base; if it's empty, ask the caller. The Base line is always the plan's base, and the caller's words never narrow the change; on a re-verify the plan's `Fix rounds:` record does (step 2). Record any caller instruction to look at less on the report's Base line.
- The plan's `Fix rounds:` line. A count of 1 or more makes this a re-verify of the last entry listed there: the gates still run in full, but steps 2 and 3 cover only that entry's rows and files, and the previous `verify-report.md` supplies the rest.

## Boundaries

- You may add or edit **test files only**. Never touch implementation code. If a fix looks obvious, describe it in the report.
- Never loosen or delete a test to make it pass.
- Never mark a criterion passed without evidence you actually observed. For a criterion about behaviour, reading the code is not observed evidence: mark it `unverified`, with what you read in Evidence and the test or manual step that would prove it. Inspecting a file counts only when the criterion is about that file's content, such as a constant, label or config entry.

## Workflow

### 1. Run the gates

Run, in order, the `build`, `typecheck`, `lint` and `test` commands from each `AGENTS.md` named under Inputs, one gate row per command per package with the package named in the Command cell, and `e2e` if it exists and its environment is available. Run all of them even if an early one fails, so the report is complete. Never choose commands yourself: if none of those files has a `Commands` section, record every gate as `none` with the note that `dev-standards` has not been run, set the result to `INCOMPLETE`, and say so in the first line of the report. Run every gate in full even if the caller says a gate may be skipped or an earlier run trusted, and note that instruction in the report.

If tests fail, separate failures that involve changed files from failures that don't. Unrelated failures are likely pre-existing; mark them as such with your reason (for example, the test hasn't been touched and covers code the change doesn't reach). Don't try to fix them.

A gate that stops before reporting any result (a crash, out of memory, a timeout, a service it needs is down) is not a pre-existing failure, because nothing was compared. Record it as `fail` with `no result` and the error in its Notes. Then, if `test-one` exists, run it on each changed test file and on each test file that references a changed module (search the test tree for the changed files' names), and record those runs in the Notes as partial evidence; never substitute folders or suites you choose for the gate. The result can be no better than `INCOMPLETE`.

### 2. Prove each acceptance criterion

Go through the rows of the plan's Test strategy table one by one, keeping the plan's numbering, one row per criterion, never collapsed. A criterion the caller's stated build scope excludes is `out of scope`, with the scope named in its evidence; it is neither passed nor unverified, unless the built part already opens the path it guards (step 3). For example, a new field that an existing endpoint persists from the request body while a later task owns its guard makes the row `failed`, not out of scope, with the endpoint and the request that gets through as its evidence. A task inside the scope that is unticked and has a `Done so far:` line is only partly built: rows the line lists as remaining are `out of scope`, quoting the line in Evidence; rows it lists as done are judged as usual. If the caller's own words exclude part of a task the scope names by number, treat it the same way, quote the words, and name the conflict in the report. Step 3's open-path rule still applies to the remaining part.

The table's rows are the only criteria. Don't add rows for checks the caller asks for, for behaviour a fix round added, for ticket checkboxes or plan Decisions entries, or for items a previous report carried. Record behaviour outside the plan under Spec drift, and a spec requirement the plan has no row for as "In the spec but missing from the plan's Test strategy", with the test that covers it, if any. All counts cover the plan's rows only.

On a re-verify, re-prove only the rows the last `Fix rounds:` entry names, by row number or through the task it names, any row that was `failed` in the previous report, and any row whose test or plan-task files the entry's changed files touch; carry every other row from the previous `verify-report.md` with its status unchanged and `carried from round <n>` in Evidence. Never carry a row the previous report invented or a section outside the template. The first verify of a build covers every row and must find everything; a later round does not look outside what the fix touched.

- **Automated test exists and passes**: record its name and path.
- **No test exists but one is possible**: write it at the level and location the plan row gives, following the testing rules in `docs/standards.md`; where a neighbouring test file contradicts a Must there, follow the standard, not the neighbour, then run it and record the result. Use the `test-one` command to run single files while iterating; run the full suite once at the end.
- **Test exists but fails**: record what was expected, what happened, the test name, and how to reproduce.
- **Only verifiable manually, or the test can't run here** (for example an e2e suite whose environment is down): do the check yourself if you can (run the command, call the endpoint, inspect the output) and record what you did and saw. If you can't, mark it unverified and say what's needed.

### 3. Check for drift

Note behavior that was implemented but isn't in the spec, and spec items with no corresponding implementation. Both are findings, even when the extra work looks useful. A spec that defines behaviour by reference ("works like X") defines every user-visible behaviour of X that the new path reaches, unless it says otherwise: where the new path differs from X, for example a different message or toast, that is a failure, not drift and not something the spec leaves undefined. If the change leaves a path unvalidated or unapproved where the spec requires either, that is a failure, not drift and not out of scope, whichever task or ticket owns the full fix. There are two kinds: a new field that an existing endpoint can persist without the new check, and an existing field that a new rule now constrains (for example a limit that must sit inside a new stored range) which an existing endpoint still writes without that rule. To find both, take each place the spec says the new check or approval applies (create, update, batch, import, approval), find the endpoint that serves it, and confirm, by a test or by tracing the handler to its save, that a request breaking the rule is refused; one that reaches the save unchecked is a failure. An open path no plan row covers goes under Failures headed `Open path: <METHOD> <route>`, not in an invented criteria row, and is not added to the criteria counts. On a re-verify, check drift and open paths in the files the last `Fix rounds:` entry lists only.

### 4. Write the report

Fill `report-template.md` in this skill folder, keeping its headings and status words exactly because `dev-build` and `dev-ship` read them: each Status and Result cell holds exactly one status word from the template, and qualifiers such as "pre-existing" or "code read" go in Notes or Evidence. Add no sections or paragraphs beyond the template's, and no drift bullets beyond the template's. A remark about behaviour the spec states is a criterion failure or a drift item: file it there. Any other remark, such as duplicate logging, caching or style, belongs to code review: leave it out of the report and the summary. Save it as `.scratch/<feature-slug>/verify-report.md`, next to the plan. If an earlier `verify-report.md` is already there, don't read it until your own checks are done and you are writing; on a re-verify, read it then only to carry the rows outside the round's scope. Build your rows from the plan, not from it. `dev-build` compares rounds; you judge this one cold. If your tool needs a Read before overwriting, do that read at write time. Set the result:

- `PASS`: every gate that ran passes, ignoring failures marked pre-existing in step 1, and every criterion passed. A gate recorded as `none` or `skipped` doesn't block `PASS`; say why in its Notes.
- `FAIL`: any gate fails because of the change, any criterion failed, or the change opens a path the spec requires to be validated or approved.
- `INCOMPLETE`: nothing failed because of the change, but at least one criterion is unverified or out of scope, or a gate gave no result.

Then give the caller a short summary: the result line, counts of passed, failed, unverified and out of scope, one line per failure, and one line per drift item or note.
