---
name: dev-mode
description: Private feedback loop for the my-dev-skills workflow, for the plugin's maintainer. After a dev- skill or agent has run, reviews its result against the installed skill's own text with one agent, has a second agent try to refute every finding, and writes one self-contained feedback report rated CRITICAL, HIGH, MEDIUM or LOW, with the reason, the scenario where it recurs and the exact text change, ready to paste into a session in the my-dev-skills repo. In that repo, hands pasted feedback to an agent that decides whether to apply it. You invoke it; it never triggers on its own.
disable-model-invocation: true
---

# dev-mode

A loop for improving `my-dev-skills` from real use. It ships with the plugin but is not documented, because it is for the maintainer. It has two sides, and the side you are on is decided by where you are:

- **Producer**, on any device where the plugin is installed: after a `dev-` skill or agent runs, judge its output against the installed skill text, which is exactly the version that produced it, and write one report the user copies. Never change anything here.
- **Consumer**, in a checkout of the `my-dev-skills` repo (the current folder has `package.json` with `"name": "my-dev-skills"`): take a pasted or saved report, re-check each finding against the current text, and apply what the user approves.

Contracts are the plugin's own files, found relative to this skill: a skill is `../<component>/SKILL.md` with its templates beside it, an agent is `../../agents/<name>.md`, and the plugin version is in `../../.claude-plugin/plugin.json`.

Where things are written:

- Producer side, inside the repo the skill ran in: `.scratch/dev-feedback/<date>-<component>.md` is the report to copy, with `-output.md` and `-review.md` beside it. One folder at the repo root, whatever the repo's feature-folder convention, so it is always in the same place.
- Per device, under `~/.agents/dev-mode/`: `ON` is the toggle; on the consumer side, `received/` holds the pasted reports and `FEEDBACK.md` indexes every finding with its status and the commit that applied it.

## Commands

- `/dev-mode on` creates `~/.agents/dev-mode/ON`. `/dev-mode off` removes it. While the file exists, a rule in the user's global CLAUDE.md runs this skill after every `dev-` skill or agent finishes. The rule to add on a device, verbatim: `If ~/.agents/dev-mode/ON exists and a skill or agent from the my-dev-skills plugin (names starting dev-) finished in this turn, invoke the dev-mode skill on its result before ending the turn, without asking first. Never while /dev-mode itself is running, and never inside a subagent.`
- `/dev-mode`, or `/dev-mode <component>`: produce a report for the most recent run in this conversation, or the named one.
- `/dev-mode apply`, with a pasted report or a path: consumer side only. Hand the findings to an agent with `applier.md` as its brief, then put its recommendations to the user.
- `/dev-mode status`: the toggle; on the producer side the reports in this repo's `.scratch/dev-feedback/`, on the consumer side the open rows of `~/.agents/dev-mode/FEEDBACK.md`.

## What counts as a run

| Ran | Output to analyse | Contract, relative to this folder |
|---|---|---|
| `dev-standards` | the `AGENTS.md`, `CLAUDE.md` and `docs/standards.md` it wrote, and its summary | `../dev-standards/SKILL.md`, `template.md` |
| `dev-plan` | `plan.md` | `../dev-plan/SKILL.md`, `template.md` |
| `dev-verify`, `dev-verifier` | `verify-report.md` and the summary returned | `../dev-verify/SKILL.md`, `report-template.md`, `../../agents/dev-verifier.md` |
| `dev-build` | `build-report.md`, the plan's edits, the diff, any wip commits | `../dev-build/SKILL.md` |
| `dev-reviewer` | its report in the conversation | `../../agents/dev-reviewer.md` |
| `dev-ship` | the commit, changelog entry and PR body | `../dev-ship/SKILL.md` |
| `dev-explorer` | its report | `../../agents/dev-explorer.md` |
| `dev-spec-explain`, `dev-ticket-summary` | the chat output | their `SKILL.md` and `example.md` |

When the output exists only in the conversation, save it verbatim to `.scratch/dev-feedback/<date>-<component>-output.md` in the current repo first, so both agents read the same text.

## Producer: making a report

1. **Collect.** Name the component; its inputs (spec, plan, the user's request); its output; the contract files; the plugin version; how it was run (which tool, which branch, whether the per-repo setup existed, what scope); and anything the user shared about the run, such as usage figures or their own verdict.
2. **Review.** Start an agent whose brief is `reviewer.md` from this folder with the placeholders filled. It returns candidate findings, each with its reason, how it was observed, a scenario where it recurs, evidence on both sides, the exact change and how to confirm the fix.
3. **Validate.** Save the reviewer's report to `.scratch/dev-feedback/<date>-<component>-review.md`, then start a second agent whose brief is `validator.md`, pointing at that file. It re-opens every cited line, tests the recurrence scenario, tries to refute each finding, and returns CONFIRMED, DOWNGRADED or DROPPED with a reason and the final version of every field. Only CONFIRMED and DOWNGRADED findings go on.
4. **Report.** Fill `report-template.md`, save it as `.scratch/dev-feedback/<date>-<component>.md` in the current repo, and show the user the report with its path. Every finding must stand alone: an agent reading only the report, with the repo in front of it, must be able to judge whether it still holds, apply it, and confirm the fix. A run with no confirmed finding gets a report that says so and lists what was checked. That is a valid result, not a failure.
5. **Hand off.** Tell the user the report is ready to copy into a session in the my-dev-skills repo with `/dev-mode apply`. Change nothing on this device, even if the repo happens to be present; the consumer side is where changes are judged against the latest text.

## Consumer: applying a report

1. Save the pasted report to `~/.agents/dev-mode/received/<date>-<component>.md` if it did not arrive as a file, and add its findings to `~/.agents/dev-mode/FEEDBACK.md` as open rows.
2. Start an agent whose brief is `applier.md`, with the report path and the repo's current commit. It says for each finding whether it still holds, is obsolete or has moved, recommends APPLY, SKIP or OBSOLETE with the cost of leaving it, and gives the final change text. It changes nothing.
3. Put its recommendations to the user with AskUserQuestion, highest severity first. Apply what they approve, run `npm run validate` and `npm run test:guard`, run `npm run bump minor` when behaviour changed and the cycle has not been bumped yet, never commit, never stage markdown. Record the outcome per finding in `FEEDBACK.md`, and add the commit hash once the user has committed.

## Severity

- **CRITICAL**: the component produced wrong or unusable output, or let an unsafe action through: a gate skipped on instruction, an open path deferred to a later ticket, a destructive command not blocked.
- **HIGH**: a rule the component needs is missing or was violated in a way that recurs on every repo: a preflight that does not stop, a report a downstream skill cannot parse.
- **MEDIUM**: the output deviates from the contract in a way downstream tolerates but a reader notices: renamed headings, collapsed rows, a missing field.
- **LOW**: wording, length, examples, cost.

## What is not a finding

- Anything without a quoted line on both sides, the contract line and the output line.
- A defect in how the run was set up, such as setup skipped, a shared branch or a gitignored folder. That is a process note in its own section, never a skill change, unless the skill should have stopped and did not.
- A preference specific to this project that would not recur elsewhere.
- Anything the validator could not reproduce.
- Cost figures on their own. They become a finding only when a rule in the skill caused the cost, such as re-rendering every page or re-running a suite for a comment change.
