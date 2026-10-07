---
name: dev-mode
description: Private feedback loop for the my-dev-skills workflow, for the plugin's maintainer. Between /dev-mode start and /dev-mode end, each top-level dev- skill that finishes is reviewed against the installed skill's own text by one agent, refuted by a second, and the surviving findings, rated CRITICAL, HIGH, MEDIUM or LOW with the reason, the recurrence scenario, the exact text change and the run's token and time cost, are appended to one feedback file in the project, ready to paste into a session in the my-dev-skills repo, where /dev-mode apply hands them to an agent that decides whether to apply them. Use only when the user types /dev-mode, or when the file ~/.agents/dev-mode/ON exists and a top-level dev- skill (not an agent inside dev-build) has just finished in this turn. Never for any other request, and never inside a subagent.
---

# dev-mode

A loop for improving `my-dev-skills` from real use. It ships with the plugin but is not documented, because it is for the maintainer. It runs in exactly two cases: the user types `/dev-mode ...`, or the toggle file exists and a top-level `dev-` skill has just finished. The toggle rule needs the model to be able to invoke this skill, which is why its frontmatter does not carry `disable-model-invocation`; the description above is what keeps it from firing anywhere else.

Two sides, decided by where you are:

- **Producer**, on any device where the plugin is installed: judge each run against the installed skill text, which is exactly the version that produced it, and append the result to the session's one feedback file. Never change anything here.
- **Consumer**, in a checkout of the `my-dev-skills` repo (the current folder has `package.json` with `"name": "my-dev-skills"`): take a pasted feedback file, re-check each finding against the current text, and apply what the user approves.

Contracts are the plugin's own files, found relative to this skill: a skill is `../<component>/SKILL.md` with its templates beside it, an agent is `../../agents/<name>.md`, and the plugin version is in `../../.claude-plugin/plugin.json`.

## One file per session

Everything a session produces goes into one file: `.scratch/dev-feedback/<date>-<name>.md` at the root of the repo the skills run in. No other file is written: outputs are pasted into the agents' prompts, the reviewer's draft is discarded once validated, and the cost figures are inline. The toggle `~/.agents/dev-mode/ON` holds that file's path while the session is open. `session-template.md` in this folder gives the file's header, the entry format and the closing summary.

## Commands

- `/dev-mode start [name]`: create the session file with its header (date, repo, plugin version, name) and write its path into `~/.agents/dev-mode/ON`. From then on, a rule in the user's global CLAUDE.md runs this skill after every top-level `dev-` skill finishes. The rule, verbatim: `If ~/.agents/dev-mode/ON exists and a top-level skill from the my-dev-skills plugin (dev-standards, dev-plan, dev-build, dev-ship, dev-spec-explain, dev-ticket-summary, or an agent the user ran directly) finished in this turn, invoke the dev-mode skill on its result before ending the turn, without asking first. Not for agents that ran inside dev-build, never while /dev-mode itself is running, and never inside a subagent.`
- `/dev-mode end`: append the closing summary to the session file, remove the toggle, and tell the user the file is ready to copy.
- `/dev-mode`, or `/dev-mode <component>`: review the most recent run, or the named one, as one entry. Appended to the open session file, or to a new file `.scratch/dev-feedback/<date>-<component>.md` when no session is open.
- `/dev-mode apply`, with a pasted file or a path: consumer side only. Hand every finding in it to an agent with `applier.md` as its brief, then put the recommendations to the user.
- `/dev-mode status`: the toggle and its file, the entries so far, and on the consumer side the open rows of `~/.agents/dev-mode/FEEDBACK.md`.

## What one entry covers

| Finished | Output to review | Contract, relative to this folder |
|---|---|---|
| `dev-standards` | the `AGENTS.md`, `CLAUDE.md` and `docs/standards.md` it wrote, and its summary | `../dev-standards/SKILL.md`, `template.md`, and `monorepos.md` when the repo is a monorepo |
| `dev-plan` | `plan.md` | `../dev-plan/SKILL.md`, `template.md` |
| `dev-build` | `build-report.md`, the plan's bookkeeping edits, the diff, and every `dev-verifier` and `dev-reviewer` run inside it, as one entry with the findings grouped by component | `../dev-build/SKILL.md`, `../dev-verify/SKILL.md`, `report-template.md`, `../../agents/dev-verifier.md`, `../../agents/dev-reviewer.md` |
| `dev-ship` | the commit, changelog entry and PR body | `../dev-ship/SKILL.md` |
| `dev-spec-explain`, `dev-ticket-summary` | the chat output | their `SKILL.md` and `example.md` |
| an agent the user ran directly | its report | the agent file, plus the skill it preloads |

A build with three fix rounds is still one entry: the reviewer sees all three verify reports and judges the pattern, not each file.

## Producer: adding an entry

1. **Collect.** Name the component; its inputs; its outputs, by path where they exist on disk and pasted where they exist only in the conversation; the contract files; the plugin version; how it was run (tool, branch, per-repo setup present or not, scope). Get the cost with `python3 <this folder>/stats.py --skill <component>` from the project folder; it reads this session's transcript from the last invocation of that component to this call and prints the table, the subagent runs, the longest gaps and the heaviest calls. In Codex, where there is no transcript in that form, write "not available".
2. **Review.** Start an agent whose brief is `reviewer.md` with the placeholders filled and the pasted outputs included. It returns candidate findings, each with its reason, how it was observed, a scenario where it recurs, evidence on both sides, the exact change and how to confirm the fix.
3. **Validate.** Start a second agent whose brief is `validator.md`, with the reviewer's full report pasted into the prompt. It re-opens every cited line, tests the recurrence scenario, tries to refute each finding, and returns CONFIRMED, DOWNGRADED or DROPPED with a reason and the final version of every field. Only CONFIRMED and DOWNGRADED findings go into the file; dropped ones get one line each.
4. **Append.** Write the entry in the format `session-template.md` gives: the run line, the cost block with a one-line reading, the findings in full, the dropped lines, the process notes, and the count of rules checked and found correct. Tell the user the entry is in. An entry with no confirmed finding says so and is still written, with the count of rules checked.

## Consumer: applying a file

1. Save the pasted file to `~/.agents/dev-mode/received/<date>-<name>.md` if it did not arrive as a file, and add each finding to `~/.agents/dev-mode/FEEDBACK.md` as an open row.
2. Start an agent whose brief is `applier.md`, with the file path and the repo's current commit. It says for each finding whether it still holds, is obsolete or has moved, recommends APPLY, SKIP or OBSOLETE with the cost of leaving it, and gives the final change text. It changes nothing.
3. Put its recommendations to the user with AskUserQuestion, highest severity first. Apply what they approve, run `npm run validate` and `npm run test:guard`, run `npm run bump minor` when behaviour changed and the cycle has not been bumped yet, never commit, never stage markdown. Record the outcome per finding in `FEEDBACK.md`, and add the commit hash once the user has committed.

## Severity

- **CRITICAL**: the component produced wrong or unusable output, or let an unsafe action through: a gate skipped on instruction, an open path deferred to a later ticket, a destructive command not blocked.
- **HIGH**: a rule the component needs is missing or was violated in a way that recurs on every repo: a preflight that does not stop, a report a downstream skill cannot parse.
- **MEDIUM**: the output deviates from the contract in a way downstream tolerates but a reader notices: renamed headings, collapsed rows, a missing field.
- **LOW**: wording, length, examples, cost.

## What is not a finding

- Anything without a quoted line on both sides, the contract line and the output line.
- A defect in how the run was set up, such as setup skipped, a shared branch or a gitignored folder. That is a process note, never a skill change, unless the skill should have stopped and did not.
- A preference specific to this project that would not recur elsewhere.
- Anything the validator could not reproduce.
- Cost figures on their own. They become a finding only when a rule in the skill caused the cost, such as re-rendering every page or re-running a suite for a comment change.
