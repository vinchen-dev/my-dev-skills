# dev-mode session: {{name}}, {{date}}

Repo: {{project repo and branch}}
Plugin version: {{from .claude-plugin/plugin.json}}
Started: {{time}}

Every finding below must stand alone. An agent that reads only this file, with the my-dev-skills repo in front of it, must be able to judge whether the finding still holds, decide whether to apply it, apply it, and confirm the fix. Copy this whole file to that agent.

---

## {{HH:MM}} {{component}}

Run: {{what ran, with what inputs, scope and tool; for dev-build, the tasks built and the rounds}}
Outputs: {{paths on disk, or "pasted" for chat-only output}}
Contract: {{files}}
Verdict: {{n}} confirmed ({{by severity}}), {{n}} dropped, {{n}} process notes

### Cost

{{the stats.py table, subagent runs, longest gaps and heaviest calls}}

Read: {{one or two sentences: in line with the work or not, and the cause of any heavy call or long gap. A cause that is a rule in the skill is a finding below.}}

### {{SEVERITY}}: {{title}}, in {{component or agent the finding is about}}
- Reason: {{why this matters, in one or two sentences: what goes wrong for the reader of the output or for the next skill in the chain}}
- How it was found: {{the concrete observation in this run, in order: what the contract says, what the output did, what was compared to see the difference}}
- Where it recurs: {{a concrete scenario on another repo or spec that would trigger the same deviation, with the input and the wrong output described}}
- Evidence: {{contract file:line "quoted text"}} against {{output file:line or pasted-output line "quoted text"}}
- Change: {{file:line}}, replace with: {{exact text}}
- Also touch: {{files, or none}}
- Confirm by: {{what the next run must show, or the check to run}}
- Validator: {{CONFIRMED, or DOWNGRADED from X because ..., or NEW}}

### Dropped by the validator
- {{title}}: {{reason, with the line that refuted it}}

### Process notes, not skill changes
- {{note}}

Checked and correct: {{n}} rules, {{one line naming the areas}}

---

## Summary, {{time}}

| Entry | Component | Findings | Tokens | Minutes |
|---|---|---|---|---|
| {{HH:MM}} | {{component}} | {{n}} ({{by severity}}) | {{new input + output, subagents included}} | {{active}} |

Totals: {{entries}} entries, {{findings by severity}}, {{tokens}} tokens, {{active minutes}} active minutes.
Open for the maintainer: {{the findings, highest severity first, one line each}}
