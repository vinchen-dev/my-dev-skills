# Agent rules for this repo

This repo is `my-dev-skills`, a plugin for Claude Code and Codex. It contains **skills** (markdown instructions), **agents** (subagent definitions) and **hooks** (small Node scripts), not application code. When you edit it, you are editing instructions that other agents will follow, so precision in wording matters more than in most codebases.

Read `README.md` for the user-facing overview and the workflow diagram.

## What each part is for

| Path | What it is | Who reads it |
|---|---|---|
| `skills/<name>/SKILL.md` | One skill: frontmatter (`name`, `description`) plus instructions | The agent, when the skill triggers or is invoked |
| `skills/<name>/*.md` (other files) | Templates and references the skill loads on demand | The skill, when it needs them |
| `skills/dev-standards/stacks/` | Optional stack-specific rule packs; only `README.md` exists until a pack is added | `dev-standards` |
| `agents/<name>.md` | A Claude Code subagent: frontmatter (`name`, `description`, `tools`, `model`, optional `skills`) plus its system prompt | Claude Code, when `dev-build` or the user delegates |
| `hooks/hooks.json` | Registers the two hook scripts with Claude Code | Claude Code, on every edit and Bash call |
| `hooks/*.js` | The hook scripts (formatter after edits, guard before Bash) | Run automatically; must never block valid work |
| `hooks/guard-cases.txt` | Expected exit code per command for the guard, run by `scripts/test-guard.js` | You, after changing the guard |
| `bin/install.js` | The `npx my-dev-skills` installer. Installs onto the device: one real copy symlinked into each tool, never through a marketplace. The copy is this clone when run from one, otherwise `~/.agents/<name>`. Shows a checklist of tools when it has a terminal. Only `--matt` runs marketplace commands, and only against Matt's own | Users |
| `scripts/build-manifests.js` | Generates the four manifest files from `package.json` | You, after changing `package.json` |
| `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/` | **Generated** manifests and marketplaces | The plugin systems; never hand-edit |
| `package.json` | Source of truth for name, version, description, and the list of Matt Pocock's skills we depend on | The installer and the manifest script |

## How the pieces fit

- `dev-standards` runs once per user repo and writes that repo's `AGENTS.md`, `CLAUDE.md` and `docs/standards.md`. Every other skill reads commands from that `AGENTS.md` (fixed keys: `test`, `test-one`, `lint`, `typecheck`, `build`, `e2e`, `format`, `format-one`) and conventions from `docs/standards.md`. Changing a key name means changing it everywhere.
- Per feature: `dev-plan` writes `.scratch/<feature-slug>/plan.md` (the slug is the spec's existing folder for a local spec, or `<issue-number>-<kebab-title>` for an issue); `dev-verify` writes `verify-report.md` beside it; `dev-build` orchestrates and writes the base commit into the plan's `Base:` field; `dev-ship` commits and opens the PR.
- `dev-build` calls Matt Pocock's `tdd` and `code-review` skills by name. His `implement` is marked for human invocation only, so dev-build runs `tdd` per plan task instead. It runs `code-review` from its own context because that skill spawns its own sub-agents, and, with the user's permission asked once in preflight, it makes work-in-progress commits on the feature branch before each review because `code-review` only sees committed work; `dev-ship` squashes them. Without permission it skips `code-review` and the `dev-reviewer` covers all seven axes. No commit or PR the workflow writes carries AI attribution. The `dev-reviewer` agent is a deliberate second look at performance, resources, security, reliability, structure and tests, which `code-review` covers only through one short standards pass; when `code-review` has run it skips spec conformance and the code-smell baseline. A finding both report is fixed once in `dev-build`.
- Specs come from Matt's `to-spec`, which publishes to the issue tracker configured in the user repo's `docs/agents/issue-tracker.md` (a `.scratch/<feature-slug>/spec.md` file or a GitHub/GitLab issue). Don't assume a fixed spec path.
- Report formats in `dev-verify`, `dev-reviewer` and `dev-build` are parsed by `dev-build`. Keep the `Result:` and `Verdict:` lines and section headings stable if you change anything else. The plan's Test strategy table is the numbered list `dev-verify` checks and reports against, so keep its `#` column. `dev-build`'s fallback line states the dev-reviewer's axis count; adding an axis means updating it.

## Commands

- test: `npm run validate && node --check bin/install.js && node --check hooks/format-file.js && node --check hooks/guard-commands.js && npm run test:guard`
- test-one: `none`
- lint: `none`
- typecheck: `none`
- build: `npm run manifests`
- e2e: `none`
- format: `none`
- format-one: `none`

`npm run validate` runs `claude plugin validate .`; also run it on `skills` and `agents` (`claude plugin validate skills`). To test an install, add the repo folder as a local marketplace: `claude plugin marketplace add <path>` then `claude plugin install my-dev-skills@my-dev-skills`, and check `claude plugin details my-dev-skills` lists 6 skills, 3 agents and 2 hooks. To test the guard, run `npm run test:guard`, which pipes every case in `hooks/guard-cases.txt` through it; `guard-commands.js` must exit 2 for a blocked command and 0 otherwise. To test the formatter, pipe hook JSON into it (see its header for the input shape).

## Rules

- Frontmatter is YAML. A `description` containing a colon followed by a space is invalid unless quoted, and Claude Code then silently fails to load the file. Avoid `: ` in descriptions, or quote the value. Run the validator after every frontmatter change.
- A skill's `name` must equal its folder name; an agent's `name` must equal its file name.
- Descriptions decide when a skill triggers: say what it does, when to use it, and when not to (name the neighbouring skill). Keep them under 1024 characters.
- Keep `SKILL.md` bodies short (most under 150 lines). Move long reference material into a separate file the skill loads only when needed.
- Never hand-edit the generated manifests. Change `package.json` and run `npm run manifests`.
- Bump `version` in `package.json` and add a `CHANGELOG.md` entry with every user-visible change.
- Hooks must be safe defaults: the formatter exits 0 even when the formatter fails, and the guard blocks only the specific destructive patterns listed in it. Add cases to `hooks/guard-cases.txt` for every pattern you add or change, blocked and allowed spellings both, and run `npm run test:guard`.
- Don't add fallback copies of Matt Pocock's skills. The workflow depends on his versions by name; the installer's `--matt` flag installs them as a plugin, refuses to install on top of file copies, and warns about duplicates.
- Don't add a stack pack unless the same stack-specific rules have been missed in more than one repo. Rules that apply to every stack belong in `skills/dev-standards/template.md`.
- This repo has no `.scratch/` or `docs/standards.md` of its own on purpose: the workflow skills are for the user's repos, not for editing this one.

## Protected paths

- `.claude-plugin/`, `.codex-plugin/`, `.agents/plugins/` — generated by `scripts/build-manifests.js`
- `LICENSE` — MIT; keep it

## Standards

Writing style for skills and agents: instructions in plain prose, second person, one idea per paragraph, real paths and commands, no filler. Use `Must` and `Prefer` when writing rules that reviews will apply. See `skills/dev-standards/SKILL.md` § "Writing good rules" for the bar every rule must meet.
