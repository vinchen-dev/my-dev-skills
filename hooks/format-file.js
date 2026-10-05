#!/usr/bin/env node
// PostToolUse hook: after Claude edits or writes a file, run the repo's
// `format-one` command (from AGENTS.md) on that file. Does nothing when the
// repo has no format-one command, so it's safe to keep enabled everywhere.
//
// Input: hook JSON on stdin ({ tool_input: { file_path }, cwd }).
// Output: nothing on success. Never blocks the edit. When format-one itself
// can't run (command not found, or timed out) it prints a systemMessage so the
// user sees it; other formatter failures go to stderr, which Claude Code keeps
// in its debug log only (claude --debug).

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SKIP_EXT = new Set([".md", ".json", ".lock", ".txt", ".yml", ".yaml", ".toml", ".env", ".svg", ".png", ".jpg"]);

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function findAgentsFile(start) {
  let dir = path.resolve(start);
  for (;;) {
    const candidate = path.join(dir, "AGENTS.md");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function commandFor(agentsFile, key) {
  const text = fs.readFileSync(agentsFile, "utf8");
  const section = text.split(/^## Commands\s*$/m)[1];
  if (!section) return null;
  const body = section.split(/^## /m)[0];
  const line = body.split("\n").find((l) => l.trim().startsWith(`- ${key}:`));
  if (!line) return null;
  const m = line.match(/`([^`]+)`/);
  const cmd = m ? m[1].trim() : line.split(":").slice(1).join(":").trim();
  return !cmd || cmd === "none" ? null : cmd;
}

const input = readStdin();
const file = input.tool_input && (input.tool_input.file_path || input.tool_input.path);
if (!file || SKIP_EXT.has(path.extname(file).toLowerCase())) process.exit(0);

const agentsFile = findAgentsFile(path.dirname(file)) || findAgentsFile(input.cwd || process.cwd());
if (!agentsFile) process.exit(0);

const template = commandFor(agentsFile, "format-one");
if (!template) process.exit(0);

// Escape what the shell expands inside double quotes; the function replacer keeps `$&` in paths literal.
const quoted = `"${file.replace(/[\\"$`]/g, "\\$&")}"`;
const command = template.includes("<file>") ? template.replace(/(["']?)<file>\1/g, () => quoted) : `${template} ${quoted}`;
const res = spawnSync(command, { shell: true, cwd: path.dirname(agentsFile), encoding: "utf8", timeout: 30000 });
if (res.status !== 0) {
  const detail = (res.stderr || res.stdout || "").trim().slice(0, 500);
  const timedOut = Boolean(res.error && res.error.code === "ETIMEDOUT");
  // 127 is the shell's "command not found"; with a timeout, both mean the format-one line is wrong, not the file.
  if (res.status === 127 || timedOut) {
    const why = timedOut ? "timed out after 30s" : "command not found";
    process.stdout.write(JSON.stringify({ systemMessage: `my-dev-skills formatter: format-one ${why} (${command.slice(0, 120)}). Check the format-one line in ${agentsFile}.` }) + "\n");
  } else {
    process.stderr.write(`format-one failed for ${file}: ${detail}\n`);
  }
}
process.exit(0);
