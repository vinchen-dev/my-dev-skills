# Verify report: {{feature name}}

Date: {{date}}
Spec: {{path}} · Plan: {{path}} · Base: {{branch or commit}}
Result: {{PASS | FAIL | INCOMPLETE}}

## Gates

| Gate | Command | Result | Notes |
|---|---|---|---|
| build | `{{command}}` | pass / fail / none | |
| typecheck | `{{command}}` | pass / fail / none | |
| lint | `{{command}}` | pass / fail / none | {{new errors only}} |
| test | `{{command}}` | pass / fail | {{x passed, y failed, z pre-existing}} |
| e2e | `{{command}}` | pass / fail / skipped | {{why skipped}} |

## Acceptance criteria

| # | Criterion | Status | Evidence |
|---|---|---|---|
| 1 | {{criterion}} | passed / failed / unverified / out of scope | {{test name and path, or what you ran and saw; for out of scope, the build scope that excludes it}} |

## Failures

### {{Criterion # or gate}}
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

## Tests added or changed

- `{{path}}` — {{what it covers}}
