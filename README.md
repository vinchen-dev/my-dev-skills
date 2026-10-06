# my-dev-skills

Plan, verify and build skills that extend [Matt Pocock's skills](https://github.com/mattpocock/skills) with a technical plan step, spec verification, and an implement → verify → review loop. Stack-agnostic: each repo's commands and coding standards are generated once by `dev-standards` and read by every other skill.

## The workflow

```
Once per repo:   setup-matt-pocock-skills → dev-standards

Per feature:     grill-me → to-spec → dev-plan → to-tickets (optional) → dev-build → dev-ship
                                                                             │
                   implement (once) → verify ⇄ fix → code-review + dev-reviewer ⇄ fix → report

Bugs:            diagnosing-bugs
```

With your permission, asked once at the start of a build, `dev-build` commits work in progress on a feature branch before each review pass, because Matt's `code-review` only sees committed work; `dev-ship` squashes those commits into one. If you decline, `dev-build` skips `code-review` and the dev-reviewer covers all axes. No commit or PR carries AI attribution.

| Name | Type | Role | Edits code? |
|---|---|---|---|
| `dev-standards` | Skill (this plugin) | Generates `AGENTS.md`, `CLAUDE.md` and `docs/standards.md` from repo evidence | Rules and docs only |
| `dev-plan` | Skill (this plugin) | Technical design and a test strategy that derives acceptance criteria from the spec and maps each to a test | No |
| `dev-verify` | Skill (this plugin) | Runs the repo's gates and proves each criterion; writes `verify-report.md` | Tests only |
| `dev-build` | Skill (this plugin) | Orchestrates implement → verify → review, applies fixes, reports | Yes; work-in-progress commits only with your permission |
| `dev-ship` | Skill (this plugin) | Commit message, PR description (via Matt's `pr` when installed), changelog entry | Commits only when asked |
| `dev-ticket-summary` | Skill (this plugin) | Condenses a finished investigation into a ticket-ready summary to paste. You invoke it; it is never triggered automatically | No |
| `dev-spec-explain` | Skill (this plugin) | Explains a feature spec in plain language for product, QA, operations and support, lists the affected features, then groups the changes by feature with each change as its own small reviewable item, plus what does not change and gaps in the spec. Never reports code impact | No |
| `dev-explorer` | Agent (this plugin) | Read-only codebase scan for `dev-plan` and `dev-standards`; optionally uses a Graphify knowledge graph and an Obsidian project vault, see below | No |
| `dev-verifier` | Agent (this plugin) | Runs `dev-verify` in an isolated context | Tests only |
| `dev-reviewer` | Agent (this plugin) | Dedicated second look after `code-review`: tool output, performance and resource use, security, reliability, structure, tests | No |
| Hooks | Hooks (this plugin) | Format each edited file with the repo's `format-one` command; block destructive git, database and publish commands | Enforced |
| `grill-me`, `to-spec`, `to-tickets`, `tdd`, `code-review`, `diagnosing-bugs`, `setup-matt-pocock-skills`, and `pr` when present | Skills ([Matt Pocock](https://github.com/mattpocock/skills), installed separately) | Interview, spec, tickets, implementation, standards + spec review, debugging, per-repo setup, PR body | Varies |

## Install

**Claude Code:**

```bash
claude plugin marketplace add vinchen-dev/my-dev-skills
claude plugin install my-dev-skills@my-dev-skills

claude plugin marketplace add mattpocock/skills          # required, see below
claude plugin install mattpocock-skills@mattpocock
```

Or the same from inside a session with `/plugin marketplace add` and `/plugin install`.

**Codex:**

```bash
codex plugin marketplace add vinchen-dev/my-dev-skills
codex plugin add my-dev-skills@my-dev-skills
```

Then install Matt's skills separately in Codex, from his own repo. Codex gets the skills only, since agents and hooks are Claude Code concepts.

**You must install [Matt Pocock's skills](https://github.com/mattpocock/skills) as well. They are a hard dependency, not an optional extra.** `dev-build` calls his `tdd` and `code-review` by name and stops at preflight if they are missing, and the per-repo setup below starts with his `setup-matt-pocock-skills`. They install from his own marketplace rather than being re-listed in this one, so his updates reach you directly from [mattpocock/skills](https://github.com/mattpocock/skills). The `npx` installer does the same thing with `--matt`.

### Or install once for both tools

The commands above register this repo as a marketplace in one tool. The installer does something different: it puts **one copy of the plugin on your machine** and links both tools to it, so a single update reaches both.

```bash
npx -y github:vinchen-dev/my-dev-skills init          # install or update, for Claude Code and Codex
npx -y github:vinchen-dev/my-dev-skills init --matt   # also install Matt Pocock's skills
npx -y github:vinchen-dev/my-dev-skills uninstall     # remove this plugin; Matt's skills stay
```

On a terminal, `init` shows a checklist, already ticked for the tools whose CLI it found:

```
Install for which tools?
  arrows to move, space to toggle, a for all, enter to confirm

 > [x] Claude Code
   [x] Codex
```

Add `--claude` or `--codex` to choose without being asked, and `--yes` to take every detected tool, which is what a piped or CI run does on its own. `uninstall` asks nothing and removes exactly what the install recorded, so a run that chose one tool never disturbs the other.

| Where | What goes there |
|---|---|
| `~/.agents/my-dev-skills` | The one real copy: manifest, skills, agents, hooks |
| `~/.claude/skills/my-dev-skills` | A symlink to that copy. Claude Code loads skills, agents and hooks from it |
| `~/.agents/skills/` | One symlink per skill, the user location Codex's docs name. Skills only |

A later `init` refreshes that single copy and both tools see it at once, with no plugin update step. It never registers this plugin with a marketplace, and it refuses to overwrite or delete anything it did not create. If symlinks are not possible on your machine it copies per tool instead, which loses the hooks.

Run `init` from a git clone and it skips the copy: the clone itself becomes the one real copy, and both tools link straight at it, so your edits are live with no reinstall. Only a clone is treated this way, because an `npx` run happens in a cache npm deletes afterwards. Force either side with `--shared` or `--link`.

**Pick one route, not both**, since the marketplace commands and the installer put files in different places. Matt's skills are the exception: `--matt` always installs them from his own marketplace.

The shorter `npx my-dev-skills ...` form needs the npm package, which is not published yet. The `github:` form above works today.

### Working on this plugin itself

Clone it and add the checkout as the marketplace instead, `claude plugin marketplace add /path/to/my-dev-skills`. Claude Code loads it live from that folder, so edits apply on the next session with no reinstall. A marketplace name is registered once, so remove the GitHub one first if you already added it.

The installer does the same thing with no flag. Run `node bin/install.js init` from the clone and it links both tools at the clone, because it has a `.git`. Add `--shared` when you want to test the copy a real user gets instead.

### Uninstalling

Use the route you installed with.

**The installer:**

```bash
npx -y github:vinchen-dev/my-dev-skills uninstall
```

It drops the symlinks, deletes the shared copy if it made one, and removes its record at `~/.my-dev-skills.json`. Removing a symlink never follows it, so a linked clone is left untouched. Matt's skills stay. Add `--dry-run` to see the plan without doing it.

Run it **from the folder you installed from**. The safety check only deletes links pointing into that folder or into `~/.agents/my-dev-skills`, so an `npx` run cannot remove a clone's links and the other way round. If it refuses, it says so, keeps the record, and exits non-zero, so nothing is stranded and you can retry from the right folder. For a clone install that is `node bin/install.js uninstall` in the clone.

**The marketplace route:**

```bash
claude plugin uninstall my-dev-skills
claude plugin marketplace remove my-dev-skills    # optional, forgets the source too

codex plugin remove my-dev-skills@my-dev-skills
codex plugin marketplace remove my-dev-skills     # optional
```

**Matt Pocock's skills are separate** and survive either route, which is deliberate since other workflows use them. Remove them with `claude plugin uninstall mattpocock-skills` and, if you want, `claude plugin marketplace remove mattpocock`.

Start a new session in each tool afterwards for the change to take effect.

## Per-repo setup

1. Run Matt's `setup-matt-pocock-skills`. When it asks which file to create, answer `AGENTS.md`. It writes `docs/agents/issue-tracker.md` and `docs/agents/domain.md` (plus `docs/agents/triage-labels.md` when his `triage` skill is installed), and adds an `## Agent skills` block.
2. Run `dev-standards`. It scans the codebase, verifies the real commands, asks a handful of questions, and writes or updates:

```
your-project/
├── AGENTS.md              # commands, protected paths, workflow rules (+ Matt's Agent skills block)
├── CLAUDE.md              # @AGENTS.md
├── docs/standards.md      # naming, structure, size, error handling, testing, performance, security
└── .scratch/<feature>/    # per feature: spec.md (from to-spec, if local tracker), plan.md, verify-report.md
```

Review `AGENTS.md` and `docs/standards.md` once. They are the only per-repo input to the workflow. Re-run `dev-standards` after major changes; it proposes updates, applies only what you approve, and never touches rules you wrote in `docs/standards.md`.

The order matters: Matt's setup edits `CLAUDE.md` whenever one exists, and Codex only reads `AGENTS.md`.

## Repo layout

```
skills/            dev-plan, dev-verify, dev-build, dev-ship, dev-ticket-summary, dev-spec-explain (with a worked example), dev-standards (with template, monorepos reference and stack packs)
agents/            dev-explorer, dev-verifier, dev-reviewer
hooks/             hooks.json + format-file.js (post-edit formatter) + guard-commands.js (blocks destructive commands)
.claude-plugin/    Claude Code manifest and marketplace (generated)
.codex-plugin/     Codex manifest (generated)
.agents/plugins/   Codex marketplace (generated)
bin/install.js     npx installer
AGENTS.md          rules for agents editing this repo (CLAUDE.md imports it)
scripts/           build-manifests.js — regenerates the manifests from package.json
                   bump.js — bumps the version and opens the next CHANGELOG section (run by the pre-commit hook)
.githooks/         pre-commit — bumps the patch version on the first commit after a push; enable with `git config core.hooksPath .githooks`
```

`package.json` is the source of truth for name, version, description and the list of Matt's skills. After changing it, run `npm run manifests`.

## Developing and testing locally

Add the repo folder as a local marketplace in Claude Code and install from it, so you test the same way users install. Test one skill at a time on a real repo: `dev-standards` first, since everything else depends on its output, then `dev-plan`, then `dev-verify`, then `dev-build`.

## Verified

Checked against the real tools (October 2026):

- `claude plugin validate` passes for the plugin manifest, marketplace, skills and agents; a real marketplace install from the local path shows 7 skills, 3 agents and 2 hooks.
- The `claude plugin marketplace add / install / update / uninstall / list` commands used by the installer exist with that syntax.
- Installing from the published GitHub repo verified on both tools: `claude plugin marketplace add` plus `claude plugin install` loads 7 skills, 3 agents and 2 hooks, and `codex plugin marketplace add` plus `codex plugin add` installs on Codex. Claude Code clones over SSH first and falls back to HTTPS, so no GitHub SSH key is needed.
- Matt's marketplace is `mattpocock`, his plugin `mattpocock-skills` (1.2.3 at the time). Every skill this workflow uses is in that release except `pr`, which is on his `main` branch after the 1.2.3 tag; his manifest pins the version, so `plugin update` won't fetch it until he bumps it, and `dev-ship` falls back to its own PR structure when `pr` is absent.
- Matt's skills resolve from the plugin as `mattpocock-skills:<name>`, for example `mattpocock-skills:tdd`.
- Codex 0.145 plugin commands match `CONFIG` (`plugin add`, `plugin remove`, `plugin list --json`, `plugin marketplace add`); the `.agents/plugins/marketplace.json` fields match Codex's bundled marketplaces; Codex user skills are scanned in both `~/.agents/skills` (documented) and `~/.codex/skills` (where the `skills` CLI writes).
- The `skills` CLI (vercel-labs, 1.7.0) accepts the flags the fallback passes (`add`, `--skill`, `-a`, `-y`, `-g`); it needs Node 22.20 or newer.
- The guard passes every case in `hooks/guard-cases.txt` via `npm run test:guard`; the formatter tested with simulated inputs; installer tested for install, uninstall, dry run and duplicate detection.

## Still to confirm

- Publication: the GitHub repository is live and both marketplace routes are verified from it. The npm package is not published, so the `npx` installer cannot be fetched yet.
- Codex subagent support: `dev-verifier` and `dev-reviewer` are Claude Code agents. In Codex, `dev-build` runs `dev-verify` and the reviewer axes inline.

## License

MIT. Matt Pocock's skills are installed from his repo and keep his license.
