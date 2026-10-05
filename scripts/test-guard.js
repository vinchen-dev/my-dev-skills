#!/usr/bin/env node
// Runs every case in hooks/guard-cases.txt through hooks/guard-commands.js and
// checks the exit code. Line format: <expected exit><TAB><command>; lines
// starting with # are comments. Also checks that malformed stdin exits 0.
// Run: npm run test:guard

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const hook = path.join(root, "hooks", "guard-commands.js");
const run = (stdin) => spawnSync(process.execPath, [hook], { input: stdin, encoding: "utf8" }).status;

let total = 0;
let failures = 0;
const lines = fs.readFileSync(path.join(root, "hooks", "guard-cases.txt"), "utf8").split("\n");
for (const line of lines) {
  if (!line.trim() || line.startsWith("#")) continue;
  const tab = line.indexOf("\t");
  if (tab === -1) {
    failures++;
    console.log(`bad line (no tab): ${line}`);
    continue;
  }
  const expected = line.slice(0, tab).trim();
  const command = line.slice(tab + 1);
  total++;
  const got = run(JSON.stringify({ tool_input: { command } }));
  if (String(got) !== expected) {
    failures++;
    console.log(`FAIL expected ${expected}, got ${got}: ${command}`);
  }
}

for (const [label, stdin] of [["empty stdin", ""], ["invalid JSON", "not json"], ["no tool_input", "{}"]]) {
  total++;
  const got = run(stdin);
  if (got !== 0) {
    failures++;
    console.log(`FAIL expected 0, got ${got}: ${label}`);
  }
}

console.log(`${total - failures}/${total} guard cases passed`);
process.exit(failures ? 1 : 0);
