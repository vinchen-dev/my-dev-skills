# Plan: {{feature name}}

Spec: {{path to spec.md, or the issue reference, e.g. #123}}
Status: draft <!-- draft | approved | in progress | done -->
Base: {{branch the work starts from; dev-build adds the commit, e.g. main @ 3f2a9c1}}
WIP commits: not asked <!-- allowed | declined; dev-build writes the user's answer here in preflight -->
Fix rounds: 0 <!-- dev-build adds one per fix round with its failure keys and changed files; checked against the round limit; from round 2 the verifier and reviewer cover only the last entry -->
Tickets: none <!-- dev-build writes the confirmed ticket → tasks and rows mapping here when a build is scoped by a ticket -->

## Summary

{{Two or three sentences: what changes and the overall approach.}}

## Approach

{{How the change fits the codebase: which layers or modules it touches, what patterns it follows, any new concepts it introduces.}}

### Alternatives considered

- {{Alternative}} — rejected because {{reason}}

## Affected areas

- `{{path}}` — {{what changes here}}

## Test strategy

One row per criterion, derived from the spec's user stories, testing decisions and any explicit acceptance criteria, each written as an observable outcome. `dev-verify` checks this table, not the spec.

| # | Acceptance criterion | Level | Test | Location |
|---|---|---|---|---|
| 1 | {{criterion}} | unit / integration / e2e / manual | {{what the test checks}} | `{{path}}` |
| 2 | {{when a data path changes: behaviour at the expected scale, or when a dependency fails}} | integration | {{what the test checks}} | `{{path}}` |

## Tasks

Each task leaves the code working. Tick a task's checkbox when it is done; `dev-build` does this as it runs each task with `tdd`. A task a scoped build only partly covered stays unticked and gets a `Done so far:` line, written by `dev-build`, naming the Test strategy rows completed and the rows that remain, for example `Done so far: rows 20-21 (endpoint); remaining: rows 22-23 (CSV button)`.

### - [ ] 1. {{Task title}}
- Files: `{{path}}`, `{{path}}`
- Test: {{test to write or update}}
- Done when: {{observable result}}
- Depends on: {{none | task number}}

### - [ ] 2. {{Task title}}
- Files:
- Test:
- Done when:
- Depends on:

## Risks and mitigations

- {{Risk}} — {{how the plan reduces it}}

## Decisions

- {{date}}: {{decision}} — {{reason}}

## Out of scope and follow-ups

- {{Idea or improvement not covered by the spec}}
