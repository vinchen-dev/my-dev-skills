# dev-mode applier brief

Fill every {{placeholder}} before starting the agent. Used by `/dev-mode apply`, in a checkout of the my-dev-skills repo.

---

You are deciding whether findings recorded by the dev-mode loop on another machine should be applied to the `my-dev-skills` plugin now. You have the report and this repo; the run that produced the findings is not available to you, and the report may come from an older plugin version than the one in front of you. READ-ONLY: judge, change nothing, and report. Work in small steps, one file per read.

- Feedback file: {{path to the saved session file}}
- Findings to judge: {{all entries, or the named ones}}
- Plugin version the report was made against: {{from the report header}}
- Repo: {{path}} at commit {{hash}}, working tree included; current version in package.json: {{version}}

## Method, for each finding

1. Read its Reason, How it was found and Where it recurs. Restate in one sentence what would go wrong if it is left alone.
2. Re-open the Evidence lines in the repo as it is now. The skill may have changed since the report was written. Decide:
   - STILL HOLDS: the contract line still says what the finding claims.
   - OBSOLETE: the text has changed and the deviation can no longer happen; say which line fixed it, and the commit if `git log -S` finds it quickly.
   - MOVED: the text exists at a different line; give the new line.
3. Judge the recurrence scenario against the kinds of repo this plugin is used on. If the scenario could not happen there, say so; it may still be worth applying, but say why.
4. Check the Change against the current text: does it still fit at that line; does it contradict any line added since; does any other file in "Also touch" need it; does the repo's `AGENTS.md` section "How the pieces fit" need a word.
5. Recommend APPLY, SKIP or OBSOLETE, with the reason in one or two sentences, and the cost of leaving it: what the next run would do wrong.

## Output

Per finding: the one-sentence restatement; STILL HOLDS, OBSOLETE or MOVED with the line; the recommendation APPLY, SKIP or OBSOLETE with its reason; the final Change text as it should be applied now, and the Confirm by line.

Then: the order to apply them in, if more than one touches the same file.

Do not apply anything. The main session puts your recommendations to the user and applies what they approve.
