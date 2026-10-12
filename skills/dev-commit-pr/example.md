# Worked example

A fictional feature, to show the level of detail. The repo's `AGENTS.md` states the format `<type>(<scope>): <Subject> <ticket>`; the branch is `feat/t-4821-transfer-range`.

## Commit messages

```
feat(customer transfer): Add allowed transfer range to customer update t-4821
feat(customer transfer): Approval for Edit Transfer Range t-4821
```

With a body, when the subject can't carry it:

```
feat(customer transfer): Batch edit, logs and review fixes for transfer range t-4821

- Batch Edit range row creates one proposal for all selected customers
- Submit and approve log entries show Before and After amounts
- Pending-approval lookup filtered by customer in the query
```

## Pull request

Title:

```
feat(customer transfer): Allowed transfer range validation and approval t-4821
```

Body:

```markdown
## Summary
Adds a per-customer **Allowed Transfer Range** and blocks any Transfer Limit outside it. Range changes go through a new **Edit Transfer Range** approval. Payment routing is unchanged.

Spec: `docs/features/transfer-range/spec.md`

## Changes
- **Validation:** new middleware runs before the existing limit check on create, update and batch edit (range validity, then limit-in-range).
- **Approval:** new type and permission `ApprovalPage/EditTransferRange`. Range changes on existing customers create a proposal; batch edit creates one for all selected customers. A pending limit or range item blocks new changes for that customer. Approval re-checks live values.
- **Client:** range fields on Create and Update with form-side checks, a Batch Edit row, and the Approve page filter, badge and detail view.
- **Logs:** submit and approve entries with Before and After amounts.

## Testing
- Server tests for validation, batch edit, proposals, approval and logs.
- Client tests for the form checks.
- Manual QA: Create, Update, Batch Edit, Approve page, logs.

## Deploy notes
- Seed `ApprovalPage/EditTransferRange` per environment and grant it to approver roles.
- No migration needed; customers without a range behave as before.

## Out of scope (pre-existing)
- `PATCH /customer/:id` accepts update operators in the body (separate ticket).
```

Why it reads this way: each Changes bullet is one area a reviewer would open; Testing names areas, not counts, because no clean-run count was available; Deploy notes names the permission literally so a deployer can copy it; the out-of-scope bug predates the feature and is listed, not fixed.
