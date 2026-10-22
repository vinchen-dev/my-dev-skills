---
name: dev-plan
description: Turn a finalized spec into a technical implementation plan (plan.md) with the approach, affected files, risks, ordered tasks, and a test strategy that maps every acceptance criterion to how it will be proven. Use after to-spec produces a spec and before to-tickets, implement or dev-build — whenever the user asks to plan a feature, design the approach, or break work down technically. Not for writing the spec itself (grill-me, to-spec) or for writing code (implement, dev-build).
---

# dev-plan

Produces `plan.md`: the bridge between a spec (what to build) and implementation (building it). The plan decides *how* the change fits this codebase, and its test strategy is what `dev-verify` later uses to prove the work matches the spec.

## Inputs

- The spec: the path or issue the user gave, otherwise `.scratch/<feature-slug>/spec.md`, where `to-spec` writes it for a local tracker. When it is an issue, fetch it the way `docs/agents/issue-tracker.md` says if that file exists, otherwise with the tracker's CLI. If you cannot find it, ask; Matt's `setup-matt-pocock-skills` is optional and never required.
- `AGENTS.md` for commands, protected paths and workflow rules.
- `docs/standards.md` for conventions the design must follow.
- `template.md` in this skill folder for the plan layout.

## Preconditions

Stop and tell the user if:
- the spec leaves questions open that the design depends on (suggest `grill-me` to close them)
- the spec has nothing testable: no acceptance criteria, user stories or testing decisions to derive criteria from

## Workflow

### 1. Understand the change

Read the spec, `AGENTS.md` and `docs/standards.md`. Then delegate the whole scan, every area the change touches on every side, to the `dev-explorer` agent in task mode with a description of the change, and wait for its report: pass `run_in_background: false` where the Agent tool has that flag, otherwise do nothing else until its hand-back arrives. Explore yourself only when there is no Agent tool. You need to know where the change lands, how that area works now, which patterns to follow, and every consumer of what you will change. When the report arrives, verify it rather than repeat it: for each function, field, response shape, schema, export, constant or message the change modifies, run one search for its name (`grep -rn`, and `graphify affected "<name>"` when the repo has a graph, several names per command), and open code only around a hit the report does not list or a claim it marks Uncertain, by line range, never a whole file. Don't re-open a file for what the report already cites: its `file:line` citations are the plan's, and the report is the Approach's source. When it is too thin to design from, send the explorer one follow-up with the exact questions (the Agent result says how to continue it, and it still holds the files) rather than reading them here, since every file read here sits in every later turn of this session. One source is never trusted, so the searches are not optional, even when the explorer already listed consumers. That list is what makes the plan complete.

### 2. Design the approach

Choose an approach that fits the existing patterns and standards. Note one or two alternatives you rejected and why, briefly; this saves the same debate from happening again at review time. Respect protected paths. Prefer the smallest design that satisfies the spec. For each consumer found in step 1, decide the change it needs or write why it is unaffected: a changed response shape, signature or field reaches every caller, and the plan names each one. For each new or changed path, state its failure cases (bad input, a missing record, a dependency down, a later write failing) and how each is handled, with the status, the message and what is rolled back; these become rows in step 3. A guard in front of a write resolves its id once, the way the action it protects does (cast, from one source, URL or body), uses that one value for the check and every write, and never refuses an input the action accepts; say so in the Approach, since a guard that compares the raw request value is the fix round builds pay most often. For each new or changed query, name its filter and sort fields and the index they use. When that index does not exist, the schema or migration file that adds it is a row in Affected areas and part of a task, unless the plan says why the collection stays small enough not to need one.

### 3. Derive the acceptance criteria and map each to a test

Specs from `to-spec` carry user stories and testing decisions rather than a list of acceptance criteria, so the plan derives them. Turn each user story, each testing decision, and any explicit criterion the spec does have into one numbered row of the Test strategy table, written as an observable outcome. When the spec says new behaviour works like, mirrors or is the same as an existing feature, list that feature's user-visible behaviours the new path must share (messages and toasts, pending or approval states, logs, permissions) and give each its own row; a manual row names the exact text or state expected. For each row decide the level (unit, integration, e2e or manual), the specific test, and where it lives, following the repo's test conventions. When the change touches a data path (imports, queries, lists, files, queues, external calls), add rows for how it must behave at the expected scale stated in `docs/standards.md` and when a dependency fails, for example "imports 100k rows within the memory limit" or "returns an error within 5s when the payment API is down". For every endpoint or handler the change adds or touches, add bad-input rows: wrong types, `null`, unknown ids and, where the body reaches a database update, operator and dotted keys such as `$set` or `permissions.0`, each with the status and message expected; this is how the `docs/standards.md` Must rules, such as validating input at system boundaries, become rows instead of staying unread. When the change adds a reference by name that mocked tests never resolve (a populate path or schema ref, a queue, an event, a route name), add a row that exercises it against the real registration where the repo's test setup allows, otherwise a manual row naming the request that would fail. For every rule the spec enforces (an approval, a limit, a permission check), add an abuse row: how a caller would get around it, and the refusal expected. When one request writes more than once, the approach states the order of the writes and what happens when a later one fails, and a row tests that failure. Every row must map to something. This table is the list `dev-verify` checks; it does not go back to the spec for criteria. If a row can't be tested automatically, write down how it will be verified manually and put the question of whether that is acceptable into the step 5 batch.

### 4. Break the work into tasks

Order tasks so each one leaves the code working. Each task is small: a few files, one behavior, with the files it touches, the test that proves it, and what "done" means. Every row of the Affected areas table belongs to a task's Files line; a consumer with no task is a gap in the plan, not work for the build to discover. Vertical slices (a thin end-to-end path first, then widen) usually beat layer-by-layer work. Note dependencies between tasks. If `to-tickets` runs afterwards, it slices whatever is in its context and never looks for this file, so run it in the same session or pass it `.scratch/<feature-slug>/plan.md`; its tickets then follow these tasks, and `dev-build` records which tasks and rows each ticket covers in the plan's `Tickets:` line.

### 5. Settle everything the build would otherwise ask

`dev-build` implements; a question it has to ask is a gap in this plan. Before writing, read each task as the builder will and settle in the plan every point they would have to decide. The ones builds have actually stopped on:

- A value the feature shows, stores or logs, in every mode the feature has (Create, Edit, Batch Edit) and every state: an empty input, a missing key, a batch whose selected records differ (what does Before show when their current values differ?), a request that changes nothing.
- Every message, label and locale key, with its exact text, the language files it goes in, and whether an existing entry is reused; a row or task never refers to a key or message the plan does not list.
- One save that carries fields two rules cover, for example a gated field and an ungated one in the same body: the outcome, stated once.
- A field with a fixed set of values the change reads (a status, a type, a mode): what happens for a value outside the set, as a row.
- Every existing caller of a changed endpoint: the body it sends today, checked against the new validation, with a task when it would be refused. And for every screen that must show a new field or flag, the request that actually feeds that screen, traced from the component to its data call, not the endpoint whose name matches.
- Every protected path the change must touch, listed under Decisions with the reason; approving the plan approves those edits, and `dev-build` makes them without asking again.

What is still open after that (a trade-off, a data model choice, an ambiguity the spec left open, a criterion that can only be verified manually) goes to the user now, in one batch, with your recommendation for each, and the answers go under Decisions. Don't write the plan around a guess, and don't leave a guess for the build.

### 6. Write plan.md

Fill `template.md` and save it as `.scratch/<feature-slug>/plan.md`. When the spec is a local file, that is the folder the spec already lives in. When the spec is an issue, the slug is `<issue-number>-<kebab-case-title>`, for example `123-password-reset`, and the `Spec:` field holds the issue reference. Use real paths and real names from the codebase. Keep it under about 150 lines; a plan nobody reads doesn't guide anything, and the build and every verifier and reviewer pass read the whole file, so each line here is read five times or more. The Approach states the design and the order of writes; a check's status, message and refusal live in its Test strategy row only, referenced by row number, never restated. Set the status to `draft`.

### 7. Present and wait

Summarize the approach and the task list in a few sentences, then wait for approval. Set the status to `approved` only when the user says so. `dev-build` checks this status before starting; tell the user to run it in a new session, since everything it needs is in the plan and the spec, and a session that still holds this conversation carries it into every build turn.

## Rules

- Don't write code. Describe changes; the implementation happens later.
- Don't expand scope. Ideas beyond the spec go under "Out of scope and follow-ups". A refusal, lock, validation or error case the spec doesn't state is beyond the spec too: raise it as a question, recommending to leave it out unless the spec's wording requires it, and record the answer in Decisions instead of designing it into the Approach.
- The spec wins. If the plan can't satisfy part of the spec, flag it rather than quietly changing the requirement.
- Updating an existing plan: revise it in place and record what changed and why in the Decisions section, rather than rewriting from scratch. Keep task checkboxes that are already ticked.
- The plan holds every change the build needs. `dev-build` implements; it does not find consumers. A consumer the build meets that the plan does not list stops the build as a plan gap.
