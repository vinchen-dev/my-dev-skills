# dev-mode: {{component}}, {{date}}

Run: {{what ran, on which repo, with what scope and tool}}
Plugin version: {{version from .claude-plugin/plugin.json}}
Output: {{path}}
Contract: {{files, relative to the plugin root}}
Verdict: {{n}} confirmed ({{by severity}}), {{n}} dropped, {{n}} process notes

Every finding below must stand alone. An agent that reads only this file, with the my-dev-skills repo in front of it, must be able to judge whether the finding still holds, decide whether to apply it, apply it, and confirm the fix. Copy this whole file to that agent.

## Findings

### {{SEVERITY}}: {{title}}
- Reason: {{why this matters, in one or two sentences: what goes wrong for the reader of the output or for the next skill in the chain}}
- How it was found: {{the concrete observation in this run, in order: what the contract says, what the output did, what was compared to see the difference}}
- Where it recurs: {{a concrete scenario on another repo or spec that would trigger the same deviation, described so a reader can picture the input and the wrong output}}
- Evidence: {{contract file:line "quoted text"}} against {{output file:line "quoted text"}}
- Change: {{file:line}}, replace with: {{exact text}}
- Also touch: {{files, or none}}
- Confirm by: {{what the next run's output must show, or the check to run, so the fix can be verified without re-reading this report}}
- Validator: {{CONFIRMED, or DOWNGRADED from X because ..., or NEW}}

## Dropped by the validator

- {{title}}: {{reason, with the line that refuted it}}

## Process notes, not skill changes

- {{note: how the run was set up, and why that is not the skill's fault}}

## Checked and correct

- {{rule}}: {{where the output honoured it}}

## Status

- {{finding}}: open | approved {{date}}, pending apply | declined {{date}} | applied in {{commit}}
