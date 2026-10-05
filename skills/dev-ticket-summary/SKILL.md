---
name: dev-ticket-summary
description: Condense an investigation's findings into a ticket-ready summary (problem, root cause, fix, scope, expected behaviour, pre-release steps, follow-ups) for a human to paste into a ticket. Use once the cause is established and agreed, when the user asks for a summary, a write-up or something to paste into a ticket. Not for doing the investigation (diagnosing-bugs) or for reporting on a finished build (dev-build).
disable-model-invocation: true
---

# dev-ticket-summary

Turn what the conversation established (an investigation, a grill session, an agreed spec) into one ticket-ready summary a reader who was not present can act on. The summary goes in the reply as Markdown; write a file only when asked.

## Process

1. **Collect the established findings.** From the conversation and anything it points at (spec, memory note, vault note, handoff), pull out: the symptom as the user saw it, the verified cause, the agreed fix, what is deliberately left unchanged, the accepted consequences, any ops step before release, and follow-ups parked for later. Done when every item below has a source in the conversation or is marked **assumed**.
2. **Write the summary** in the template below. Done when each section opens with its conclusion, states only what step 1 collected, and nothing a reader would have to come back and ask about is missing.
3. **Trim.** Done when it fits one screen: plain words, one idea per sentence, a file or function named only where the reader must go there, numbers only where they change a decision.

## Template

Bold labels, short paragraphs, lists for parallel items, no headers. Omit a section that has nothing; keep **Problem**, **Root cause** and **Fix** always.

```
**<Title: the symptom in one line, as the user would say it>**

**Problem**
What went wrong, who noticed, why it matters (wrong number, wrong source, lost data).

**Root cause**
First sentence: the actual cause, what is missing or wrong (e.g. "Nothing in code stops X").
Then the fact that makes it bite, then "reproduced" and how. Mark anything unverified as assumed.

**Fix**
The agreed change as numbered steps when it is a mechanism, prose when it is one rule.
Close with what is deliberately untouched.

**Scope of code change**
Files or surfaces added and edited, tests added. One line each.

**Expected behaviour after**
What now happens for the main cases, and any accepted consequence stated plainly.

**Before release**
Ops or config steps a person must do, with the reason.

**Follow-ups (separate ticket)**
Related issues found but left out, one line each.
```

## Example

```
**Users stay signed in long after the idle timeout should have logged them out**

**Problem**
Support found accounts still signed in the next morning, well past the 30-minute idle
limit. On shared machines that leaves someone else's session open, so this is a security
exposure, not just a settings bug.

**Root cause**
Nothing distinguishes a user action from a background request. The idle timer resets on
every authenticated HTTP call, and an open dashboard polls for notifications every 60
seconds, so a tab left open refreshes the session forever. Reproduced by leaving a
dashboard open for four hours untouched: the session was still valid and the timer had
never advanced past 60 seconds.

**Fix**
Reset the idle timer only on user-initiated requests:
1. Mark background endpoints (polling, health, telemetry) with a header the client sets.
2. In the session middleware, skip the timer reset when that header is present.
3. Keep the hard maximum-session cap unchanged, so a used session still expires eventually.
Untouched: the timeout value, the login flow, and the remember-me cookie.

**Scope of code change**
- New `src/auth/activity.js` deciding whether a request counts as activity.
- Three-line change in the session middleware; one header added in the API client.
- Unit tests for the classifier, one integration test for the idle path.

**Expected behaviour after**
- An idle tab logs out at 30 minutes even with polling running.
- Active use still refreshes the session as before.
- Accepted: someone reading one long page for 30 minutes without clicking is logged out.

**Before release**
Ship the client change first, or deploy both together. Server-only leaves old clients
sending no header, which would treat polling as activity and change nothing.

**Follow-ups (separate ticket)**
Warn the user a minute before expiry instead of logging out silently; audit the other
three services that share this session middleware.
```
