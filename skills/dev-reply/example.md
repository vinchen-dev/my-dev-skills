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
