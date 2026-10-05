#!/usr/bin/env node
// PreToolUse hook for Bash: blocks a short list of destructive commands that
// no skill in this workflow should ever need. Exit code 2 blocks the command
// and shows the message to Claude, which can then ask the user to run it.
//
// Input: hook JSON on stdin ({ tool_input: { command } }).
//
// The git rules accept git's global options before the subcommand (git -C dir,
// git -c key=value, git --no-pager). The SQL, publish and terraform rules match
// their phrase anywhere in the command, so a grep or commit message that quotes
// "drop table" or "npm publish" is blocked too; that costs one manual run and
// is accepted. Every rule has cases in hooks/guard-cases.txt; run them with
// `npm run test:guard`.

const fs = require("fs");

// `git`, any global options, then the subcommand.
const GIT = String.raw`\bgit(?:\s+(?:-[cC]\s*\S+|--[\w-]+(?:=\S+)?))*\s+`;
// The rest of the current shell segment.
const SEG = String.raw`[^\n|;&]*`;
// A segment or command boundary after a path.
const END = String.raw`(?:\s|;|&|\||$)`;
const git = (body) => new RegExp(GIT + body);

const RULES = [
  { re: git(String.raw`push\b` + SEG + String.raw`(?:\s--force\b|\s--force-with-lease\b|\s-[a-zA-Z]*f[a-zA-Z]*(?:\s|$))`), why: "force push rewrites shared history" },
  { re: git(String.raw`reset\b` + SEG + String.raw`\s--hard\b`), why: "git reset --hard discards uncommitted work" },
  { re: git(String.raw`clean\b` + SEG + String.raw`-[a-zA-Z]*f`), why: "git clean -f deletes untracked files" },
  { re: git(String.raw`checkout\b` + SEG + String.raw`\s\.\/?` + END), why: "git checkout . discards all working changes" },
  { re: git(String.raw`restore\b(?!` + SEG + String.raw`--staged\b(?!` + SEG + String.raw`--worktree\b))` + SEG + String.raw`\s\.\/?` + END), why: "git restore . discards all working changes" },
  { re: git(String.raw`branch\b` + SEG + String.raw`\s-[a-zA-Z]*D[a-zA-Z]*(?:\s|$)`), why: "git branch -D deletes a branch without safety checks" },
  { re: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f?[a-zA-Z]*\s+(\/|~|\$HOME|\.\.|\*)(\s|$)/, why: "recursive delete of a root, home or parent directory" },
  { re: /\bdrop\s+(database|table|schema)\b/i, why: "dropping a database object" },
  { re: /\btruncate\s+table\b/i, why: "truncating a table" },
  { re: /\b(npm|yarn|pnpm)(\s+-[\w-]+(=\S+)?(\s+[^-\s]\S*)?)*\s+publish(\s|$)/, why: "publishing a package" },
  { re: /\bterraform(\s+-\S+)*\s+(apply|destroy)(\s|$)/, why: "applying infrastructure changes" },
];

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0);
}

const command = (input.tool_input && input.tool_input.command) || "";
if (!command) process.exit(0);

const hit = RULES.find((r) => r.re.test(command));
if (hit) {
  process.stderr.write(`Blocked by my-dev-skills guard: ${hit.why}. Ask the user to run this themselves if it's intended:\n  ${command}\n`);
  process.exit(2);
}
process.exit(0);
