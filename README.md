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
| `dev-explorer` | Agent (this plugin) | Read-only codebase scan for `dev-plan` and `dev-standards`; optionally uses a Graphify knowledge graph and an Obsidian project vault, see below | No |
| `dev-verifier` | Agent (this plugin) | Runs `dev-verify` in an isolated context | Tests only |
| `dev-reviewer` | Agent (this plugin) | Dedicated second look after `code-review`: tool output, performance and resource use, security, reliability, structure, tests | No |
| Hooks | Hooks (this plugin) | Format each edited file with the repo's `format-one` command; block destructive git, database and publish commands | Enforced |
| `grill-me`, `to-spec`, `to-tickets`, `tdd`, `code-review`, `diagnosing-bugs`, `setup-matt-pocock-skills`, `pr` | Skills ([Matt Pocock](https://github.com/mattpocock/skills), installed separately) | Interview, spec, tickets, implementation, standards + spec review, debugging, per-repo setup, PR body | Varies |

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

**Working on this plugin itself:** clone it and add the checkout as the marketplace instead, `claude plugin marketplace add /path/to/my-dev-skills`. Claude Code loads it live from that folder, so edits apply on the next session with no reinstall. A marketplace name is registered once, so remove the GitHub one first if you already added it.

**One command for both tools**, straight from this repo:

```bash
npx -y github:vinchen-dev/my-dev-skills init          # install or update, for Claude Code and Codex
npx -y github:vinchen-dev/my-dev-skills init --matt   # also install Matt Pocock's skills
npx -y github:vinchen-dev/my-dev-skills uninstall     # remove this plugin; Matt's skills stay
```

The shorter `npx my-dev-skills ...` form needs the npm package, which is not published yet. The `github:` form above works today and does the same thing. It uses each tool's own marketplace commands when their CLI is available, so updates keep flowing through the tool. When that is not possible it copies this plugin once into a durable shared location (`~/.agents/my-dev-skills`) and symlinks both tools to that single copy, full parity on Claude Code and skills only on Codex, refreshing both at once on a later `init`. In every mode it refuses to overwrite or delete anything it did not create.

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
skills/            dev-plan, dev-verify, dev-build, dev-ship, dev-ticket-summary, dev-standards (with template, monorepos reference and stack packs)
agents/            dev-explorer, dev-verifier, dev-reviewer
hooks/             hooks.json + format-file.js (post-edit formatter) + guard-commands.js (blocks destructive commands)
.claude-plugin/    Claude Code manifest and marketplace (generated)
.codex-plugin/     Codex manifest (generated)
.agents/plugins/   Codex marketplace (generated)
bin/install.js     npx installer
AGENTS.md          rules for agents editing this repo (CLAUDE.md imports it)
scripts/           build-manifests.js — regenerates the manifests from package.json
```

`package.json` is the source of truth for name, version, description and the list of Matt's skills. After changing it, run `npm run manifests`.

## Developing and testing locally

Add the repo folder as a local marketplace in Claude Code and install from it, so you test the same way users install. Test one skill at a time on a real repo: `dev-standards` first, since everything else depends on its output, then `dev-plan`, then `dev-verify`, then `dev-build`.

## Verified

Checked against the real tools (October 2026):

- `claude plugin validate` passes for the plugin manifest, marketplace, skills and agents; a real marketplace install from the local path shows 6 skills, 3 agents and 2 hooks.
- The `claude plugin marketplace add / install / update / uninstall / list` commands used by the installer exist with that syntax.
- Installing from the published GitHub repo verified on both tools: `claude plugin marketplace add` plus `claude plugin install` loads 6 skills, 3 agents and 2 hooks, and `codex plugin marketplace add` plus `codex plugin add` installs on Codex. Claude Code clones over SSH first and falls back to HTTPS, so no GitHub SSH key is needed.
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
