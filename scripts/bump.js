#!/usr/bin/env node
// Bumps the version in package.json, regenerates the manifests, and opens a new
// `## x.y.z — unreleased` section at the top of CHANGELOG.md, dating the section
// that was unreleased until now with the day it was last pushed.
//
//   npm run bump            patch: 0.2.1 -> 0.2.2, for wording, docs and dependency fixes
//   npm run bump minor      0.2.1 -> 0.3.0, when behaviour changes
//   npm run bump major      0.2.1 -> 1.0.0
//
// .githooks/pre-commit runs the patch form automatically on the first commit after
// a push, so every pushed batch carries its own version. Run the minor or major
// form yourself before committing when a batch deserves it; the hook then sees the
// version already moved and does nothing. If the hook already bumped this cycle and
// you then run a bigger bump, the unreleased section is relabelled, not stacked, so
// a version that never shipped never gets a dated entry.

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const kind = process.argv[2] || "patch";
if (!["patch", "minor", "major"].includes(kind)) {
  console.error(`bump: expected patch, minor or major, got "${kind}"`);
  process.exit(1);
}

const pkgPath = path.join(root, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const [major, minor, patch] = pkg.version.split(".").map(Number);
const next =
  kind === "major" ? `${major + 1}.0.0` : kind === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

// The section that was unreleased shipped with the last push, so date it with that
// push's commit date rather than today, which may be days later.
let shipped = new Date().toISOString().slice(0, 10);
try {
  shipped = execSync("git log -1 --format=%ad --date=short origin/main", { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim() || shipped;
} catch {}

// The version on origin/main is what last shipped. If the working version is already
// past it, this cycle has been bumped once and we are only changing its size.
let pushedVersion = null;
try {
  pushedVersion = JSON.parse(execSync("git show origin/main:package.json", { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString()).version;
} catch {}
const relabel = pushedVersion !== null && pushedVersion !== pkg.version;

const esc = (v) => v.replace(/\./g, "\\.");
const clPath = path.join(root, "CHANGELOG.md");
let cl = fs.readFileSync(clPath, "utf8");
if (!cl.startsWith("# Changelog\n")) {
  console.error("bump: CHANGELOG.md must start with '# Changelog'");
  process.exit(1);
}
if (new RegExp(`^## ${esc(next)}\\b`, "m").test(cl)) {
  console.error(`bump: CHANGELOG.md already has a ${next} section`);
  process.exit(1);
}
if (relabel) {
  const current = new RegExp(`^## ${esc(pkg.version)} — unreleased$`, "m");
  if (!current.test(cl)) {
    console.error(`bump: version is already past origin/main (${pushedVersion}) but CHANGELOG.md has no "## ${pkg.version} — unreleased" section to relabel`);
    process.exit(1);
  }
  cl = cl.replace(current, `## ${next} — unreleased`);
} else {
  cl = cl.replace(/^## (\d+\.\d+\.\d+) — unreleased$/m, `## $1 — ${shipped}`);
  cl = cl.replace("# Changelog\n", `# Changelog\n\n## ${next} — unreleased\n`);
}
fs.writeFileSync(clPath, cl);

pkg.version = next;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
execSync("node scripts/build-manifests.js", { cwd: root, stdio: "ignore" });

console.log(`bump: ${pkg.name} ${[major, minor, patch].join(".")} -> ${next} (${kind}); manifests regenerated`);
console.log(
  relabel
    ? `bump: CHANGELOG.md section "## ${[major, minor, patch].join(".")} — unreleased" relabelled to ${next}.`
    : `bump: CHANGELOG.md has a new "## ${next} — unreleased" section. Add its bullets before you push.`
);
