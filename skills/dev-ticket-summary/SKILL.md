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

A worked example is in `example.md` in this folder; read it when unsure how dense a section should be.
