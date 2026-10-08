---
name: dev-plan
description: Turn a finalized spec into a technical implementation plan (plan.md) with the approach, affected files, risks, ordered tasks, and a test strategy that maps every acceptance criterion to how it will be proven. Use after to-spec produces a spec and before to-tickets, implement or dev-build — whenever the user asks to plan a feature, design the approach, or break work down technically. Not for writing the spec itself (grill-me, to-spec) or for writing code (implement, dev-build).
---

# dev-plan

Produces `plan.md`: the bridge between a spec (what to build) and implementation (building it). The plan decides *how* the change fits this codebase, and its test strategy is what `dev-verify` later uses to prove the work matches the spec.

## Inputs

- The spec. `to-spec` publishes it to the repo's issue tracker as configured in `docs/agents/issue-tracker.md`: a file at `.scratch/<feature-slug>/spec.md` for local markdown, or a GitHub/GitLab issue fetched by that file's workflow. If the user gave an issue number or path, start there; otherwise ask.
- `AGENTS.md` for commands, protected paths and workflow rules.
- `docs/standards.md` for conventions the design must follow.
- `template.md` in this skill folder for the plan layout.

## Preconditions

Stop and tell the user if:
- the spec leaves questions open that the design depends on (suggest `grill-me` to close them)
- the spec has nothing testable: no acceptance criteria, user stories or testing decisions to derive criteria from

## Workflow

### 1. Understand the change

Read the spec, `AGENTS.md` and `docs/standards.md`. Then explore the code: delegate to the `dev-explorer` agent in task mode with a description of the change, or explore yourself if the agent isn't available. You need to know where the change lands, how that area works now, which patterns to follow, and what else it touches.

### 2. Design the approach

Choose an approach that fits the existing patterns and standards. Note one or two alternatives you rejected and why, briefly; this saves the same debate from happening again at review time. Respect protected paths. Prefer the smallest design that satisfies the spec.

### 3. Derive the acceptance criteria and map each to a test

Specs from `to-spec` carry user stories and testing decisions rather than a list of acceptance criteria, so the plan derives them. Turn each user story, each testing decision, and any explicit criterion the spec does have into one numbered row of the Test strategy table, written as an observable outcome. When the spec says new behaviour works like, mirrors or is the same as an existing feature, list that feature's user-visible behaviours the new path must share (messages and toasts, pending or approval states, logs, permissions) and give each its own row; a manual row names the exact text or state expected. For each row decide the level (unit, integration, e2e or manual), the specific test, and where it lives, following the repo's test conventions. When the change touches a data path (imports, queries, lists, files, queues, external calls), add rows for how it must behave at the expected scale stated in `docs/standards.md` and when a dependency fails, for example "imports 100k rows within the memory limit" or "returns an error within 5s when the payment API is down". Every row must map to something. This table is the list `dev-verify` checks; it does not go back to the spec for criteria. If a row can't be tested automatically, write down how it will be verified manually and put the question of whether that is acceptable into the step 5 batch.

### 4. Break the work into tasks

Order tasks so each one leaves the code working. Each task is small: a few files, one behavior, with the files it touches, the test that proves it, and what "done" means. Vertical slices (a thin end-to-end path first, then widen) usually beat layer-by-layer work. Note dependencies between tasks. If `to-tickets` runs afterwards, it slices whatever is in its context and never looks for this file, so run it in the same session or pass it `.scratch/<feature-slug>/plan.md`; its tickets then follow these tasks, and `dev-build` records which tasks and rows each ticket covers in the plan's `Tickets:` line.

### 5. Surface decisions before writing

If the design needs a decision from the user (a trade-off, a data model choice, an ambiguity the spec left open, a criterion that can only be verified manually), ask now, in one batch, with your recommendation for each. Don't write the plan around a guess.

### 6. Write plan.md

Fill `template.md` and save it as `.scratch/<feature-slug>/plan.md`. When the spec is a local file, that is the folder the spec already lives in. When the spec is an issue, the slug is `<issue-number>-<kebab-case-title>`, for example `123-password-reset`, and the `Spec:` field holds the issue reference. Use real paths and real names from the codebase. Keep it under about 150 lines; a plan nobody reads doesn't guide anything. Set the status to `draft`.

### 7. Present and wait

Summarize the approach and the task list in a few sentences, then wait for approval. Set the status to `approved` only when the user says so. `dev-build` checks this status before starting.

## Rules

- Don't write code. Describe changes; the implementation happens later.
- Don't expand scope. Ideas beyond the spec go under "Out of scope and follow-ups".
- The spec wins. If the plan can't satisfy part of the spec, flag it rather than quietly changing the requirement.
- Updating an existing plan: revise it in place and record what changed and why in the Decisions section, rather than rewriting from scratch. Keep task checkboxes that are already ticked.
