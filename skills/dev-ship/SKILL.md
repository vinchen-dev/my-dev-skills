---
name: dev-ship
description: Turn a finished change into a commit and a pull request. Writes commit messages in the repo's convention, a PR description from the spec, plan and verify report, and updates the changelog if the repo keeps one. Use after dev-build reports DONE, or whenever the user asks to commit, open a PR, write a PR description or changelog entry for completed work. Asks before committing or pushing; never force-pushes. Not for dev-build's work-in-progress commits during a build (dev-build) or for reviewing the change (code-review).
---

# dev-ship

Turns completed work into something a reviewer can merge. It reads what the workflow already produced instead of re-describing the change from the diff.

## Inputs

- `AGENTS.md`: commit message format, branch conventions and any PR rules.
- `.scratch/<feature-slug>/plan.md`, `verify-report.md` and `build-report.md` beside it, and the spec the plan points to. The plan's `WIP commits:` field says whether there are work-in-progress commits to squash.
- `git status`, and `git diff <base>...HEAD --stat` with the base from the plan's `Base:` field, to confirm what the feature commit will contain, including dev-build's work-in-progress commits.

## Workflow

### 1. Confirm the change is ready

Check that `verify-report.md` says `PASS` (or `INCOMPLETE` with unverified criteria, or a gate with no result, that the user has accepted) and that the plan's status is `done`. If not, say what's outstanding and ask whether to continue anyway.

Show the user the list of files to be committed. If it includes files that don't belong to the feature (stray edits, local config), ask before including them.

### 2. Write the commit

Follow the format in `AGENTS.md`; if none is documented, use the repo's recent history as the model. The subject describes the behavior change, not the process ("add password reset via email", not "implement plan tasks 1–4"). The body summarizes what changed and why, in a few lines, taken from the plan's summary. Don't add Co-Authored-By trailers, "Generated with" footers or any other AI attribution to the commit.

Squash dev-build's work-in-progress commits into one commit per feature with `git reset --soft <base>` followed by a single commit, unless `AGENTS.md` or the plan's task structure calls for more. `<base>` is the commit in the plan's `Base:` field, never the branch name; resetting to the branch would revert whatever landed on it since the build started. Run the reset in step 5, after the user confirms. Only squash commits that haven't been pushed: `git status -sb` shows how far the branch is ahead of its upstream, and if any work-in-progress commit is already pushed, don't squash; commit the remaining work on top instead. If dev-build made no work-in-progress commits, there is nothing to squash and the feature commit is the only one.

### 3. Update the changelog

If the repo has a changelog (`CHANGELOG.md` or similar), add an entry under the unreleased section in the file's existing style. Skip this step if there's no changelog; don't create one.

### 4. Write the PR description

If Matt Pocock's `pr` skill is installed, use it to write the body, giving it the spec, plan and verify report as inputs. Otherwise use this structure:

```
## What
<Two or three sentences from the spec's goal and the plan's summary>

## Why
<The problem or need, from the spec>

## How
<Approach in a few lines; notable decisions from the plan's Decisions section>

## Verification
<Gate results and criteria counts from verify-report.md; how to try it manually if relevant>

## Notes for reviewers
<Suggestions left open by the dev-build report, known limitations, follow-ups from the plan>
```

Keep it short enough to read in a minute. Link the spec and plan if they live in the repo. When the build report's Scope line names a ticket on a real tracker, add `Closes <ticket>` so the next ticket unblocks on merge; the ticket's checkboxes stay the user's to reconcile, and the verify report is the evidence. No "Generated with" footer or other AI attribution.

### 5. Ask, then act

Present the commit message and PR description, then ask before running `git reset --soft`, `git commit`, `git push`, or creating the PR (with `gh pr create` or the equivalent, if available). Push to the current feature branch only. Never force-push, never push to the default branch directly, and never amend commits that are already pushed.
