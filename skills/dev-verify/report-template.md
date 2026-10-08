# Verify report: {{feature name}}

Date: {{date}}
Spec: {{path}} · Plan: {{path}} · Base: {{branch or commit}}
Scope: {{whole plan, or the build scope the caller named; on a re-verify, the round, the rows re-proved and the files inspected}}
Result: {{PASS | FAIL | INCOMPLETE}}

## Gates

| Gate | Command | Result | Notes |
|---|---|---|---|
| build | `{{command}}` | pass / fail / none | |
| typecheck | `{{command}}` | pass / fail / none | |
| lint | `{{command}}` | pass / fail / none | {{new errors only}} |
| test | `{{command}}` | pass / fail | {{x passed, y failed, z pre-existing; or "no result", the error, and the test-one files run}} |
| e2e | `{{command}}` | pass / fail / skipped | {{why skipped}} |
<!-- One row per command per package when the change spans packages; name the package in the Command cell. -->

## Acceptance criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | {{criterion}} | passed / failed / unverified / out of scope | {{test name and path, or what you ran and saw; for out of scope, the build scope that excludes it}} |

## Failures

### {{Criterion #, gate, or Open path: <METHOD> <route>}}
- Expected: {{from the spec}}
- Actual: {{what happened}}
- Test: `{{name and path}}`
- Reproduce: `{{command}}`
- Likely cause: {{if apparent; don't fix it}}

## Unverified

- {{Criterion #}}: {{what's needed to verify it}}

## Spec drift

- Implemented but not in the spec: {{item, or none}}
- In the spec but not implemented: {{item, or none}}
- In the spec but missing from the plan's Test strategy: {{item and the test that covers it, or none}}

## Tests added or changed

- `{{path}}` — {{what it covers}}
