---
name: dev-spec-explain
description: Explain a feature spec in plain language for non-technical readers such as product owners, QA, operations and support. Use when the user shares a spec (PDF, DOCX, Markdown, Lark page, screenshots or pasted text) and asks to summarize it, explain what changes, or describe it for users rather than developers. Output lists the affected features, then groups the changes by feature (the configuration page, the approval page, the log) with each change as its own small item a reader can check on its own, with on-screen labels, exact message text, what does not change, and gaps in the spec. Not for code-impact analysis or implementation planning; hand those to dev-plan or a dev-explorer scan.
---

# dev-spec-explain

Turn a feature spec into an explanation a non-technical reader can act on: which features are touched, what changes in each, what people will see or do differently, what stays the same, and where the spec is unclear. The reader is a product owner, tester, operations or support person. They do not want file paths, identifiers, architecture or a developer task list. That is a different output, and keeping the two apart is the point of this skill.

## When to use it

Trigger on requests like "summarize this spec", "explain this spec", "what does this feature change", or "explain it for users, for QA, for the business team", and whenever a spec is shared and the ask is an explanation rather than a code change.

Do not trigger for "what files need to change", "plan the implementation" or "estimate the work". If the user asks for those after the explanation, point them to `dev-plan` for a plan or a `dev-explorer` scan for code impact. Do not extend this output to cover them.

## Inputs

A local file (PDF, DOCX, Markdown, images or screenshots), a URL or Lark document, or pasted text. Optionally an audience hint such as QA, operations or product. Without one, write for a back-office user of the product.

## Process

1. **Read the whole document.** For a PDF, render every page: tables and screenshots carry rules that text extraction drops. Use `pdftotext -layout` only to cross-check text that rendered too small to read. Never summarize from the first few pages.
2. **Extract, in this order:**
   - the problem being solved, in one or two sentences, usually from a Background section
   - every feature touched, as a user names it on screen: page, modal, tab, button, request or proposal type, report
   - new fields, options or columns, by their on-screen label, never the data field name
   - validation rules in the order they run, with the pass and fail boundaries (does equal pass? does blank skip the check?)
   - exact error and prompt text, quoted verbatim
   - how existing records are treated compared with new ones
   - approval, permission and audit-log behaviour
   - anything the spec explicitly says is unchanged, on this page or others
3. **Detect gaps.** Empty headings, sections that end mid-sentence, roles or permissions named but never defined, rules that contradict each other, messages described but not written out. List them as decisions still to be made. Never fill a gap with a guess.
4. **Check the codebase only to confirm a name** the spec abbreviates, for example which page "Limits" refers to. Report nothing you find in code.
5. **Group the changes by affected feature**, then split each feature's changes into review items using the rules below.
6. **Write the output** with the template below, then stop. No offer to plan or implement.

## Grouping rules

Group by affected feature, then split each feature's changes into the smallest items a reader can check one at a time.

- **A group is a feature or page as the user names it on screen**: a configuration page, an approval page, a log. Order the groups the way a user meets them: where things are configured, then where they are approved, then where they are recorded. Use the same names, in the same order, as the Affected features list.
- **Inside a group, each change is its own numbered item.** One item holds one change and only the pieces that cannot be judged without it: a rule with its boundary cases and its exact error message; a new request type with its blocking rule and the message shown when blocked; a new field with its mandatory rule and how existing records are treated.
- **Changes that can each be checked on their own are separate items**, even when one builds on the other. New fields and the save check that later uses them are two items. Two different checks on the same save are two items.
- **If an item can be split without separating something from what it depends on, split it.** Number items continuously across groups, so the reader can refer to "change 5".
- **Each item's title names the change in a few words**, with the mode or moment in brackets when it matters: Create and Edit, Batch Edit, on save.

Why this shape: the reader works and tests one feature at a time, so a feature group is a self-contained review packet, and small items inside it keep each change checkable on its own. Grouping by change type (new fields, new rules, new approval) reads like release notes and loses where the change lives. Grouping by role suits sign-off meetings, so roles stay a one-line "Who is affected:" tag inside an item when they differ, never the structure.

## Output template

```
**Summary**
<Two or three lines: the problem this solves, what the system will now do, and the one big behavioural change.>

**Affected features**
- <Feature or page, as named on screen> (<which modes or parts, such as Create, Edit, Batch Edit>)
- <Next feature>

**At a glance**            <- only when three or more features are affected
| Feature | Before | After |
|---|---|---|
| <feature> | <today> | <after release> |
| ... | ... | ... |

**Changes, grouped by feature**

**<Feature or page, as named on screen>**

1. **<The change in a few words>** (<mode or moment, such as Create and Edit, or on save>)
   <Everything the reader needs to judge this change and nothing from another item: fields by on-screen label, the rule in plain words, boundary behaviour, the exact message quoted, who is affected.>

2. **<Next change in the same feature>**
   <...>

**<Next feature>**

3. **<...>**
   <...>

**What does not change**
<The behaviours the spec says are untouched. This is what stops false alarms from QA and operations.>

**One gap in the spec**   (or "Gaps in the spec" when there are several)
<Empty sections, undefined permissions, contradictions, missing message text, phrased as what still needs deciding.>
```

The Affected features list is the reader's scope check and the table of contents for the groups: one line per feature by its on-screen name, no detail, the same names in the same order as the group headings.

A worked example is in `example.md` in this skill's folder. Read it the first time you use the skill, or whenever you are unsure how finely to split.

## Writing rules

- Lead with the summary. Everything else goes under it.
- Each item must stand on its own. If the reader has to look at another item to understand this one, the split is wrong.
- Use on-screen labels ("Min Per Transaction"), never identifiers (`minSingleLimit`).
- No file paths, function names, route names or database terms.
- Quote error and prompt messages exactly as the spec writes them.
- Say who is affected: new records against existing ones, requester against approver.
- State boundary behaviour in words: "equal values are fine", "blank skips the check".
- One idea per sentence. No em-dashes, no arrows, no chains of parentheses.
- Aim for 250 to 400 words plus the table, shorter when the spec is small.
- Add nothing the spec does not contain. Flag ambiguity instead.
- Do not end with a question such as "want me to plan this?".

## Signs you have drifted

You are writing the wrong output if a file path, a camelCase name, or the words "middleware", "schema", "endpoint" or "handler" appear, or if a bullet starts with a verb a developer would do: add, regenerate, wire. That is a code-impact report. Delete it and return to the template.
