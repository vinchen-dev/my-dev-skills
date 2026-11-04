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
1. Grant `ApprovalPage/EditTransferRange` to your role.
2. Customer > Update: set the range to 100 to 500 and save. Expect a pending **Edit Transfer Range** item on the Approve page and the customer's range unchanged until it is approved.
3. Customer > Update on the same customer: change the limit. Expect "A transfer change is already pending approval" and no new item.
4. Approve page: filter by **Edit Transfer Range**, open the item and approve it. Expect the range applied and a log entry with Before and After amounts.
5. Customer > Update: with the range 100 to 500, set the limit to 900 and save. Expect "Transfer limit must be within the allowed range" and no change.
6. Customer > Batch Edit: select two customers, set a range and save. Expect one pending item covering both.

## Deploy notes
- Seed `ApprovalPage/EditTransferRange` per environment and grant it to approver roles.
- No migration needed; customers without a range behave as before.

## Out of scope (pre-existing)
- `PATCH /customer/:id` accepts update operators in the body (separate ticket).
```

Why it reads this way: each Changes bullet is one area a reviewer would open; Testing is a path a reviewer can walk in a few minutes, setup first and one step per behaviour with the message or state to expect, and says nothing about the automated tests because the diff shows them; Deploy notes names the permission literally so a deployer can copy it; the out-of-scope bug predates the feature and is listed, not fixed.
