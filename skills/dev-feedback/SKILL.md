---
name: dev-feedback
description: Feedback review of the my-dev-skills workflow, for the plugin's maintainer. Typed by the user as /dev-feedback, it reviews the whole conversation so far, every run of a my-dev-skills skill or agent in it, against the installed skill text. One agent finds deviations, a second tries to refute them, and the surviving findings, rated and with the exact text change and each run's cost, go into one feedback file. In a my-dev-skills checkout, /dev-feedback apply re-checks a pasted feedback file against the current text and applies what the user approves. Runs only when the user types it.
disable-model-invocation: true
---

# dev-feedback

A review for improving `my-dev-skills` from real use. It ships with the plugin but is not documented, because it is for the maintainer. It runs only when the user types `/dev-feedback`: its frontmatter carries `disable-model-invocation`, so no other skill, rule or agent can start it, and there is nothing to switch on or off.

Two sides, decided by where you are:

- **Producer**, on any device where the plugin is installed: review the whole conversation, judging each run against the installed skill text, which is exactly the version that produced it, and write the result to one feedback file. Change nothing else.
- **Consumer**, in a checkout of the `my-dev-skills` repo (the current folder has `package.json` with `"name": "my-dev-skills"`): take a pasted feedback file, re-check each finding against the current text, and apply what the user approves.

Contracts are the plugin's own files, found relative to this skill: a skill is `../<component>/SKILL.md` with its templates beside it, an agent is `../../agents/<name>.md`, and the plugin version is in `../../.claude-plugin/plugin.json`.

## Commands

- `/dev-feedback [name]`: review every run in this conversation and write `.scratch/dev-feedback/<date>-<name>.md` at the root of the repo the skills ran in. The name defaults to the last top-level component reviewed, such as `dev-build`. Runs an earlier `/dev-feedback` in this conversation already reviewed are skipped, and the new entries are appended to that review's file.
- `/dev-feedback apply`, with a pasted file or a path: consumer side only. Hand every finding in it to an agent with `applier.md` as its brief, then put the recommendations to the user.
- `/dev-feedback status`: consumer side only. The open rows of `~/.agents/dev-feedback/FEEDBACK.md`.

One review writes one file. Outputs are pasted into the agents' prompts, the reviewer's draft is discarded once validated, and the cost figures are inline. `session-template.md` in this folder gives the file's header, the entry format and the closing summary.

## Finding the runs

List them with `python3 <this folder>/stats.py --runs` from the project folder. It reads this session's transcript and prints, in order, every start of a plugin skill, typed or through the Skill tool, and every call to a plugin agent, each with its position among runs of the same component. Group them into entries:

- One entry per top-level skill run. Agent calls between a skill's start and the next skill's start belong to that skill's entry, such as the `dev-explorer` inside `dev-plan` or `dev-init` and the `dev-verifier` and `dev-reviewer` inside `dev-build`, unless the user asked for the agent themselves.
- An agent the user ran directly is its own entry.
- A run the next one cut off before the model answered, which `--skill` reports as having no model calls, is not an entry.
- Runs of `dev-feedback` itself are not entries.

When the listing has no runs, tell the user there is nothing to review and write no file. In Codex, where there is no transcript in that form, list the runs from the conversation itself and write "not available" for every cost.

The whole conversation is the evidence, not only each run's output: what the user asked before the run, the questions the skill put to them and their answers, every correction, re-prompt or manual fix they made afterwards, and what the next skill did with the output. A correction the user had to make is the strongest sign that a rule is missing or unclear. When the conversation was compacted and a run's chat output or the user's words around it are no longer in your context, read them from the transcript whose path `--runs` prints.

## What one entry covers

| Finished | Output to review | Contract, relative to this folder |
|---|---|---|
| `dev-init` | the `AGENTS.md`, `CLAUDE.md` and `docs/standards.md` it wrote, and its summary | `../dev-init/SKILL.md`, `template.md`, and `monorepos.md` when the repo is a monorepo |
| `dev-plan` | `plan.md` | `../dev-plan/SKILL.md`, `template.md` |
| `dev-build` | `build-report.md`, the plan's bookkeeping edits, the diff, and every `dev-verifier` and `dev-reviewer` run inside it, with the findings grouped by component | `../dev-build/SKILL.md`, `../dev-verify/SKILL.md`, `report-template.md`, `../../agents/dev-verifier.md`, `../../agents/dev-reviewer.md` |
| `dev-verify`, run on its own | `verify-report.md` | `../dev-verify/SKILL.md`, `report-template.md` |
| `dev-ship` | the commit, changelog entry and PR body | `../dev-ship/SKILL.md` |
| `dev-spec-explain`, `dev-ticket-summary`, `dev-reply`, `dev-commit-pr` | the chat output | their `SKILL.md` and `example.md` |
| an agent the user ran directly | its report | the agent file, plus the skill it preloads |

A build with three fix rounds is still one entry: the reviewer sees all three verify reports and judges the pattern, not each file. A finding about how one run's output failed the next run, such as a plan the build could not follow, belongs to the entry of the run that produced the output.

## Producer: writing the file

1. **List and group** the runs as above, and tell the user in one line which entries you will write.
2. **Collect**, for each entry: the component; its inputs; its outputs, by path where they exist on disk and pasted where they exist only in the conversation; the contract files; the plugin version; how it was run (tool, branch, per-repo setup present or not, scope); what the user said around it, quoted in order; and what the next run did with its output. Get the cost with `python3 <this folder>/stats.py --skill <component> --nth <n>`, with `n` from the listing. The span runs to the next skill's start, so work the user did between two runs is counted in the earlier one; say so in the cost reading when that happened.
3. **Review.** Start one agent per entry, all together, each with `reviewer.md` as its brief, the placeholders filled and the pasted outputs and the user's words included. Each returns candidate findings with the reason, how it was observed, a scenario where it recurs, evidence on both sides, the exact change and how to confirm the fix.
4. **Validate.** As each reviewer returns, start an agent with `validator.md` as its brief and that reviewer's full report pasted in. It re-opens every cited line, tests the recurrence scenario, tries to refute each finding, and returns CONFIRMED, DOWNGRADED or DROPPED with a reason and the final version of every field. Only CONFIRMED and DOWNGRADED findings go into the file; dropped ones get one line each.
5. **Write** the file in the format `session-template.md` gives: the header, one entry per run in conversation order, then the closing summary. An entry with no confirmed finding says so and is still written, with the count of rules checked. Tell the user the path and the confirmed findings by severity.

## Consumer: applying a file

1. Save the pasted file to `~/.agents/dev-feedback/received/<date>-<name>.md` if it did not arrive as a file, and add each finding to `~/.agents/dev-feedback/FEEDBACK.md` as an open row.
2. Start an agent whose brief is `applier.md`, with the file path and the repo's current commit. It says for each finding whether it still holds, is obsolete or has moved, recommends APPLY, SKIP or OBSOLETE with the cost of leaving it, and gives the final change text. It changes nothing.
3. Put its recommendations to the user with AskUserQuestion, highest severity first. Apply what they approve, run `npm run validate` and `npm run test:guard`, run `npm run bump minor` when behaviour changed and the cycle has not been bumped yet, never commit, never stage markdown. Record the outcome per finding in `FEEDBACK.md`, and add the commit hash once the user has committed.

## Severity

- **CRITICAL**: the component produced wrong or unusable output, or let an unsafe action through: a gate skipped on instruction, an open path deferred to a later ticket, a destructive command not blocked.
- **HIGH**: a rule the component needs is missing or was violated in a way that recurs on every repo: a preflight that does not stop, a report a downstream skill cannot parse.
- **MEDIUM**: the output deviates from the contract in a way downstream tolerates but a reader notices: renamed headings, collapsed rows, a missing field.
- **LOW**: wording, length, examples, cost.

## What is not a finding

- Anything without a quoted line on both sides: the contract line, and the output line or the user's words.
- A defect in how the run was set up, such as setup skipped, a shared branch or a gitignored folder. That is a process note, never a skill change, unless the skill should have stopped and did not.
- A preference specific to this project that would not recur elsewhere.
- Anything the validator could not reproduce.
- Cost figures on their own. They become a finding only when a rule in the skill caused the cost, such as re-rendering every page or re-running a suite for a comment change.
