# Worked example

What the session had established: a totals endpoint times out on PROD at its 5 s limit because the plan runs an IXSCAN on the existing index and then a FETCH of every matching document to read `amount` and `processFee`. On QAT, with the same index plus those two trailing keys, the explain shows `PROJECTION_COVERED`, 0 documents read and 180 ms for 215,309 rows.

What the DBA last said: the two fields do not belong in the index because they are only summed, since fields go in an index only when filtered or sorted on; raise the query's timeout to 60 s instead.

The ask: build the original index on PROD.

## Short form

The default, and what the user sent after one "make it concise":

> Good morning, following up on this. Can we go ahead with the original index on PROD? A 60 s timeout only delays the error since the query still fetches every matching document, so it grows with the date range and daily volume. The covered index removes the fetch (the QAT plan shows `PROJECTION_COVERED` with 0 documents opened), so the limit stops mattering.

Why it reads this way: the opener marks it as a follow-up; the ask comes second so a skimming reader sees it; the DBA's alternative (raise the limit) is answered in one sentence with the mechanism; the term they can search is named, not defined; nothing follows the last fact.

Cut from the first draft: "We'll verify the explain on PROD after the build and confirm with you before the old index is dropped." The user had not promised that step in the thread, so it stayed out. Also cut: a one-line definition of `PROJECTION_COVERED`, because a DBA knows it and the term alone is enough to search.

## Proof form

Sent earlier in the same thread, when the DBA had pushed back on the fields themselves and the user asked for "a reply with the stats and the query, make a comparison":

> Tested the totals query on UAT (current index) and QAT (covered index built), same filter as the PROD request.
>
> | | UAT, current index | QAT, covered index |
> |---|---|---|
> | Plan | IXSCAN then FETCH | IXSCAN only (PROJECTION_COVERED) |
> | Matching rows | 8,161 | 215,309 |
> | Documents opened | 8,161 (one per row) | 0 |
> | Time | 21 ms | 218 ms |
>
> The current index already answers the filter, but the plan then opens every matching document just to read amount and processFee. The covered index carries those two fields, so the query sums from the index and opens nothing. On PROD the documents are not in cache, so each open is a disk read; that is why one day hits the 5 s limit and three days take 17.6 s.
>
> Query used:
> ```js
> db.withdrawals.explain("executionStats").aggregate([
>   { $match: { /* the exact filter the page sends */ } },
>   { $project: { _id: 0, amount: 1, processFee: 1 } },
>   { $group: { _id: null, totalAmount: { $sum: "$amount" }, totalFees: { $sum: "$processFee" } } }
> ])
> ```

The table carries the proof, so the prose only explains the mechanism once and ends on the PROD consequence. The query is there because the DBA will rerun it; it is the only code in the message.

## Corrections that shaped these forms

From the real thread, in the order the user gave them: "be concise", "make it natural and concise", "the tone should be like an inquiry but suggesting it", "just make it a statement", "I want to add PROJECTION_COVERED, the idea is they can search it in case they're not familiar with it". Each one is a rule above; a new draft that needs none of them is the target.

## Explanation form

A different thread. What the session had established: a deposit-monitoring tool showed accounting "Account locked out. Please request for your account to be unlocked" and stopped itself, four times in one afternoon. The bank never locked the account. In the test environment the tool's own browser was too slow to start, and the tool's error check read the browser's start-up error as a lockout because that error text contained the letters "lock", inside a browser setting named popup-blocking. Manual logins worked each time, and every deposit that arrived was posted. The agreed fix: a failure in the tool's own browser is never reported as a locked account, while a real lock message from the bank still shows as before.

The user asked for a concise "Root cause:" and "suggested fix:" to give to the accounting team, then added "note that is for non technical person".

> **Root cause:** The "Account locked out" message did not come from the bank. It came from our auto-deposit tool itself. In the test environment the tool's background browser was too slow to start, and the tool's error check wrongly read that start-up failure as a locked account, because the technical error text happened to contain the letters "lock" (from a browser setting called "popup-blocking"). The bank was never contacted during those attempts and the account was never locked, which is why our manual logins worked every time. The tool then paused itself until we logged it back in. No deposit was missed.
>
> **Suggested fix:** Change the tool so that a technical failure in its own browser can never be reported as a locked account. A real lock message from the bank will still show as before. Until the change is deployed, treat this message as a false alarm: no unlock request to the bank is needed, just let us know and we will log the tool back in.

Why it reads this way: the root cause opens with whose side the message came from, because the reader's first question is whether the bank locked them. The one sentence of mechanism makes "how could that happen" concrete with a word they can picture instead of an error line. It ends on what was not affected, since a missed deposit is what accounting would worry about. The fix says what they will see, and the ask is its last sentence.

Left out, though the session had them: the error text, the browser's three-minute start-up limit, the four times of day, the server and file names, and the infrastructure follow-up for the platform team. None of them changes what accounting does.

The correction that shaped it: the first suggested fix said the "locked" message would only ever come from the bank's page. The user then narrowed the agreed fix to failures in the tool's own browser, so the message had to promise only that; the reader will hold the team to whatever the fix line says.
