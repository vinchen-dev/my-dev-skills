# dev-spec-explain: worked example

Input: a 14-page spec for a back-office tool, titled "Customer Transfer Range Validation". The reader is the operations team. The spec touches three features, so the output carries the At a glance table, and the changes split into eight items. About 440 words plus the table:

> **Summary**
> This feature stops staff from setting a customer's transfer limits to amounts the customer's account cannot actually handle. The system will now record the account's allowed range and refuse to save any Transfer Limit that falls outside it. Changing that allowed range becomes a new approval item.
>
> **Affected features**
> - Customers page (Create, Edit, Bulk Edit)
> - Approvals page
> - Activity log
>
> **At a glance**
>
> | Feature | Before | After |
> |---|---|---|
> | Customers page | Only Min and Max Per Transfer on the customer; limit saves if min is not above max and the gap check passes | Allowed Min and Max Amount added; a limit must also sit inside that range, and a range change is blocked if the current limit falls outside it |
> | Approvals page | Only Edit Transfer Limit requests | New Edit Allowed Transfer Range request; the two block each other per customer |
> | Activity log | Limit changes logged | Range approvals logged with Before and After values |
>
> **Changes, grouped by feature**
>
> **Customers page**
>
> 1. **New allowed-range fields on the customer** (Create, Edit, Bulk Edit)
>    Two new fields appear next to Min and Max Per Transfer: *Allowed Min Amount* and *Allowed Max Amount*. For new customers both are mandatory. Existing customers can leave them blank for now and nothing breaks.
>
> 2. **Transfer Limit must sit inside the allowed range** (on save)
>    The system checks that Min Per Transfer is not below the allowed min and Max Per Transfer is not above the allowed max. Equal values are fine. If the check fails, the save is blocked and the error names the side that is wrong, for example "Transfer Limit Min is below Allowed Min Amount." The existing gap check still runs afterwards exactly as today.
>
> 3. **Changing the allowed range on an existing customer** (on save)
>    When you fill in or change the allowed range, the system checks that customer's current Transfer Limit against the new range. If the current limit sits outside it, the save is blocked and you must fix the Transfer Limit first.
>
> **Approvals page**
>
> 4. **Approval for changes to the allowed range**
>    A new request type, *Edit Allowed Transfer Range*, appears. Any change to the allowed range goes to approval, and the old range stays in effect until approved.
>
> 5. **One pending range request per customer**
>    The same customer cannot have both an *Edit Transfer Limit* and an *Edit Allowed Transfer Range* request pending at once. You will see "Pending approvals" with the request number and must wait until it is approved, rejected or cancelled.
>
> 6. **Approval limited to configured roles**
>    Only roles configured under Approval Process can approve.
>
> 7. **You cannot approve your own submission**
>    Requester and approver must be different people.
>    Who is affected: whoever submits the change, and the approver roles.
>
> **Activity log**
>
> 8. **Range approvals in the log**
>    Approvals of the new request type are logged with the Before and After allowed amounts, alongside the usual customer update entry.
>
> **What does not change**
> Customer-facing transfers, routing and amount selection still use Min and Max Per Transfer only. The new fields are purely a safeguard at configuration time.
>
> **One gap in the spec**
> Section 8, Operation Permission, is empty. Which permission controls who can approve the new request type still needs to be defined.

Why the shape is right: the three groups are the three places the reader will go to test, in the order they meet them, and they match the Affected features list. Inside the Customers page, items 2 and 3 are both checks on the same save but each can be tested without the other, so they are separate. Item 2 keeps its boundary cases and its error message together because a tester cannot judge the rule without them. Items 4 to 7 are four checks on the same approval that a tester can run one at a time, so they are separate even though 5 to 7 build on 4; item 5 keeps the blocking rule and its pending message together because a tester cannot judge one without the other.

The first attempt at the same spec listed source files with line numbers, field identifiers, middleware order and tests to add. The user's correction was that they wanted "what feature would change and pages", for a user, not a coder. That first attempt was a code-impact report, which belongs to `dev-plan` and `dev-explorer`.
