#!/usr/bin/env node
// my-dev-skills installer
//
//   npx my-dev-skills init            install or update this plugin for Claude Code and Codex
//   npx my-dev-skills init --matt     also install or update Matt Pocock's skills
//   npx my-dev-skills init --link     symlink this checkout in instead of copying or using a marketplace
//   npx my-dev-skills uninstall       remove this plugin (leaves Matt's skills alone)
//   --dry-run                         show what would run, without running it
//   --help, -h                        this text
//
// When a tool's own plugin commands aren't available (no CLI, or this repo
// isn't published yet), the default fallback copies this plugin once into a
// durable shared location, ~/.agents/<name>, and symlinks each tool to that:
// full parity on Claude Code (skills, agents and hooks all load through the
// symlink, verified against Claude Code 2.1.267), skills-only on Codex (one
// symlink per skill into ~/.agents/skills, the location its own docs name).
// One copy, both tools, a later `init` refreshes it for both at once. If
// symlinks aren't possible on this machine, it copies independently per tool
// instead, which loses the hooks and, on Codex, the agents.
//
// --link skips the copy entirely and symlinks straight at THIS checkout, so
// edits here apply immediately with no reinstall step; only use it from a
// checkout you intend to keep, not an ephemeral `npx` cache.
//
// Strategy: use each tool's own plugin/marketplace commands when its CLI is
// installed (so future updates flow through the tool), and fall back to the
// shared copy when it isn't. Matt's skills are never installed twice: every
// known location is checked first, and existing installs are updated in place.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const cfg = pkg.devSkills || {};
const matt = cfg.matt || {};
const repoUrl = ((pkg.repository && pkg.repository.url) || "").replace(/\.git$/, "");
const ownerRepo = repoUrl.replace(/^.*github\.com[/:]/, "");
const home = os.homedir();
const sharedDir = path.join(home, ".agents", pkg.name);
let sharedCopyReady = false;

// ---------------------------------------------------------------------------
// Tool-specific commands and paths. Verify these against the current CLIs
// once, then leave the rest of the file alone.
// ---------------------------------------------------------------------------
const CONFIG = {
  claude: {
    cli: "claude",
    marketplaceAdd: (src) => ["plugin", "marketplace", "add", src],
    install: (plugin, marketplace) => ["plugin", "install", `${plugin}@${marketplace}`],
    update: (plugin) => ["plugin", "update", plugin],
    uninstall: (plugin) => ["plugin", "uninstall", plugin],
    list: ["plugin", "list"],
    userSkillsDir: path.join(home, ".claude", "skills"),
    userAgentsDir: path.join(home, ".claude", "agents"),
    projectSkillsDir: path.join(process.cwd(), ".claude", "skills"),
  },
  codex: {
    cli: "codex",
    marketplaceAdd: (src) => ["plugin", "marketplace", "add", src],
    install: (plugin, marketplace) => ["plugin", "add", `${plugin}@${marketplace}`],
    update: null, // Codex has no per-plugin update; `plugin marketplace upgrade` only refreshes snapshots.
    uninstall: (plugin, marketplace) => ["plugin", "remove", `${plugin}@${marketplace}`],
    list: ["plugin", "list", "--json"],
    userSkillsDir: path.join(home, ".codex", "skills"),
    extraSkillsDirs: [path.join(home, ".agents", "skills")], // Codex's documented user skills folder.
    userAgentsDir: null, // Codex subagents are configured differently; agents are Claude-only for now
    projectSkillsDir: path.join(process.cwd(), ".agents", "skills"),
  },
  // Fallback for Matt's skills when a tool's CLI isn't available: the generic
  // skills CLI, which can target several agents at once.
  mattFallback: (skillName, agentFlags) => [
    "npx", "-y", "skills@latest", "add", matt.repo, "--skill", skillName, ...agentFlags, "-y", "-g",
  ],
  mattAgentFlag: { claude: ["-a", "claude-code"], codex: ["-a", "codex"] },
  manifestFile: path.join(home, ".my-dev-skills.json"),
};

// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith("-")) || "init";
const flags = new Set(args.filter((a) => a.startsWith("-")));
const wantsHelp = flags.has("--help") || flags.has("-h");
const dryRun = flags.has("--dry-run");
const withMatt = flags.has("--matt");
const link = flags.has("--link");

if (wantsHelp || !["init", "uninstall"].includes(command)) {
  console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 28).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
  process.exit(wantsHelp ? 0 : 1);
}

const log = (msg) => console.log(msg);
const warn = (msg) => console.log(`  ! ${msg}`);

function run(cmd, cmdArgs, { quiet } = {}) {
  // Quiet calls are read-only probes (plugin list), so they run even in dry-run.
  if (dryRun && !quiet) {
    log(`  $ ${cmd} ${cmdArgs.join(" ")}`);
    return { ok: true, out: "" };
  }
  const res = spawnSync(cmd, cmdArgs, { encoding: "utf8", shell: process.platform === "win32" });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  if (!quiet) log(`  $ ${cmd} ${cmdArgs.join(" ")}`);
  if (res.status !== 0 && !quiet && out.trim()) log(`    ${out.trim().split("\n").slice(-3).join("\n    ")}`);
  return { ok: res.status === 0, out };
}

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG.manifestFile, "utf8"));
  } catch {
    return null;
  }
}

// Claude's list is text ("name@marketplace"); Codex's --json list has an `installed` array.
function isInstalledPlugin(tool, out, name) {
  if (tool === "codex") {
    try {
      return (JSON.parse(out).installed || []).some((p) => p.name === name);
    } catch {
      return false;
    }
  }
  return new RegExp(`\\b${name}\\b`).test(out);
}

function hasCli(cli) {
  return spawnSync(cli, ["--version"], { encoding: "utf8", shell: process.platform === "win32" }).status === 0;
}

// A copied folder can't prove it is ours the way a symlink can, so we leave a
// marker inside and only ever replace a folder that carries one.
const MARKER = ".my-dev-skills";
const isOurCopy = (dir) => fs.existsSync(path.join(dir, MARKER));

function copyDir(src, dest) {
  if (dryRun) return log(`  copy ${src} -> ${dest}`);
  if (fs.existsSync(dest) && !isOurCopy(dest)) {
    warn(`${dest} already exists and we didn't put it there; leaving it alone`);
    return;
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  fs.writeFileSync(path.join(dest, MARKER), `${pkg.name} ${pkg.version}\n`);
  log(`  copied -> ${dest}`);
}

// Point `dest` at `src` with a symlink, replacing whatever was there. Removing
// a symlink (even recursively) only unlinks it; it never touches the target
// it pointed at, so this is safe to call on our own previous links.
function linkOne(src, dest) {
  if (dryRun) return log(`  link ${dest} -> ${src}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const existing = fs.lstatSync(dest, { throwIfNoEntry: false }); // truthy for a dangling symlink too
  if (existing && !isOurs(dest, existing)) {
    warn(`${dest} already exists and we didn't put it there; leaving it alone`);
    return;
  }
  if (existing) fs.rmSync(dest, { recursive: true, force: true }); // unlinks the old link, never its target
  fs.symlinkSync(src, dest, "dir");
  log(`  linked -> ${dest}`);
}

// True only for a symlink that already points inside this checkout or the
// shared copy. Anything else at that path belongs to someone else: these
// directories are shared with other tools, so we replace only our own links.
function isOurs(dest, stat) {
  if (!stat.isSymbolicLink()) return false;
  try {
    const target = path.resolve(path.dirname(dest), fs.readlinkSync(dest));
    return [root, sharedDir].some((base) => target === base || target.startsWith(base + path.sep));
  } catch {
    return false;
  }
}

// Copies just what a plugin needs to load (manifest, skills, agents, hooks)
// into the one durable shared location, once per run even though both tools
// may need it. Safe to re-run: it replaces whatever was there before.
function ensureSharedCopy() {
  if (sharedCopyReady) return;
  if (dryRun) {
    log(`  copy this checkout -> ${sharedDir}`);
    sharedCopyReady = true;
    return;
  }
  fs.rmSync(sharedDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(sharedDir, ".claude-plugin"), { recursive: true });
  fs.copyFileSync(path.join(root, ".claude-plugin", "plugin.json"), path.join(sharedDir, ".claude-plugin", "plugin.json"));
  for (const dir of ["skills", "agents", "hooks"]) fs.cpSync(path.join(root, dir), path.join(sharedDir, dir), { recursive: true });
  log(`  copied this checkout -> ${sharedDir}`);
  sharedCopyReady = true;
}

// Claude Code loads a whole plugin, skills, agents and hooks, from one
// directory under ~/.claude/skills/<name> with its own .claude-plugin/plugin.json,
// even when that directory is a symlink (verified 2026-10-05, Claude Code
// 2.1.267). Codex has no equivalent for a bundled plugin; it reads individual
// skill folders from ~/.agents/skills, so each skill gets its own symlink,
// skills only, same limitation the other install methods have on Codex.
function linkSelf(tool) {
  const c = CONFIG[tool];
  log(`\n[${tool}] linking ${pkg.name}`);
  if (tool === "claude") {
    linkOne(root, path.join(c.userSkillsDir, pkg.name));
  } else {
    for (const name of fs.readdirSync(path.join(root, "skills"))) {
      linkOne(path.join(root, "skills", name), path.join(home, ".agents", "skills", name));
    }
  }
  return { method: "link" };
}

// ---------------------------------------------------------------------------
// This plugin
// ---------------------------------------------------------------------------
function installSelf(tool) {
  const c = CONFIG[tool];
  log(`\n[${tool}] installing ${pkg.name}`);

  if (hasCli(c.cli) && ownerRepo) {
    const added = run(c.cli, c.marketplaceAdd(ownerRepo));
    const installed = added.ok && run(c.cli, c.install(pkg.name, pkg.name));
    if (installed && installed.ok) {
      if (c.update) run(c.cli, c.update(`${pkg.name}@${pkg.name}`)); // a repeat install is a no-op; update picks up a new version
      return { method: "marketplace" };
    }
    warn(`${c.cli} plugin commands failed; falling back to a shared copy`);
  } else {
    warn(hasCli(c.cli) ? "no repository URL in package.json" : `${c.cli} CLI not found`);
  }

  return sharedSelf(tool);
}

// Default fallback: one real copy under ~/.agents/<name>, and this tool gets
// a symlink into it, same shape and the same loading mechanism as --link,
// just pointing at the durable shared copy instead of the live checkout.
function sharedSelf(tool) {
  const c = CONFIG[tool];
  ensureSharedCopy();
  log(`\n[${tool}] linking ${pkg.name} to the shared copy at ${sharedDir}`);
  try {
    if (tool === "claude") {
      linkOne(sharedDir, path.join(c.userSkillsDir, pkg.name));
    } else {
      for (const name of fs.readdirSync(path.join(root, "skills"))) {
        linkOne(path.join(sharedDir, "skills", name), path.join(home, ".agents", "skills", name));
      }
    }
    return { method: "shared" };
  } catch (err) {
    warn(`couldn't create a symlink here (${err.code || err.message}); copying independently instead`);
    return copyFallback(tool);
  }
}

// Last resort, when even a symlink can't be made (for example Windows without
// symlink privileges): copies independently per tool. No hooks either way,
// and no agents on Codex, since neither travels without a real plugin load.
function copyFallback(tool) {
  const c = CONFIG[tool];
  const skillsSrc = path.join(root, "skills");
  for (const name of fs.readdirSync(skillsSrc)) {
    copyDir(path.join(skillsSrc, name), path.join(c.userSkillsDir, name));
  }
  if (c.userAgentsDir) {
    const agentsSrc = path.join(root, "agents");
    for (const file of fs.readdirSync(agentsSrc)) {
      if (dryRun) log(`  copy ${file} -> ${c.userAgentsDir}`);
      else {
        fs.mkdirSync(c.userAgentsDir, { recursive: true });
        fs.copyFileSync(path.join(agentsSrc, file), path.join(c.userAgentsDir, file));
      }
    }
    log(`  agents -> ${c.userAgentsDir}`);
  }
  warn(c.userAgentsDir ? "copied skills and agents only; the formatter and command-guard hooks come only with the marketplace install" : "copied skills only; agents and hooks come only with the marketplace install");
  return { method: "copy" };
}

function uninstallSelf(tool) {
  const c = CONFIG[tool];
  log(`\n[${tool}] removing ${pkg.name}`);
  if (hasCli(c.cli)) run(c.cli, c.uninstall(pkg.name, pkg.name));
  // Only remove what init actually wrote, per the recorded method; never touch same-named folders we didn't create.
  const prior = readManifest();
  const method = prior && prior.tools && prior.tools[tool] && prior.tools[tool].self;
  if (!prior) {
    warn("no install record found; skill files, if any, were left in place");
    return;
  }
  // mustBeOurs guards the shared directories: install refuses to overwrite an
  // entry it didn't create, so uninstall must refuse to delete one too.
  // ownership: "symlink" checks the link target, "marker" checks the copy marker.
  const removeTarget = (target, ownership) => {
    const stat = fs.lstatSync(target, { throwIfNoEntry: false }); // covers a dangling symlink too
    if (!stat) return;
    const ours = ownership === "symlink" ? isOurs(target, stat) : isOurCopy(target);
    if (!ours) {
      warn(`${target} isn't one of ours; leaving it alone`);
      return;
    }
    if (dryRun) log(`  remove ${target}`);
    else {
      fs.rmSync(target, { recursive: true, force: true }); // unlinks a symlink without touching its target
      log(`  removed ${target}`);
    }
  };
  if (method === "copy") {
    for (const name of fs.readdirSync(path.join(root, "skills"))) removeTarget(path.join(c.userSkillsDir, name), "marker");
  } else if (method === "link" || method === "shared") {
    if (tool === "claude") removeTarget(path.join(c.userSkillsDir, pkg.name), "symlink");
    else for (const name of fs.readdirSync(path.join(root, "skills"))) removeTarget(path.join(home, ".agents", "skills", name), "symlink");
  }
  if (c.userAgentsDir && fs.existsSync(c.userAgentsDir)) {
    for (const file of fs.readdirSync(path.join(root, "agents"))) {
      const target = path.join(c.userAgentsDir, file);
      if (!fs.existsSync(target)) continue;
      if (dryRun) log(`  remove ${target}`);
      else {
        fs.rmSync(target, { force: true });
        log(`  removed ${target}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Matt's skills
// ---------------------------------------------------------------------------
function findMatt(tool) {
  const c = CONFIG[tool];
  const found = [];

  if (hasCli(c.cli)) {
    const { out } = run(c.cli, c.list, { quiet: true });
    if (isInstalledPlugin(tool, out, matt.pluginName)) found.push({ where: "plugin" });
  }
  for (const dir of [c.userSkillsDir, c.projectSkillsDir, ...(c.extraSkillsDirs || [])]) {
    const present = matt.skills.filter((s) => fs.existsSync(path.join(dir, s)));
    if (present.length) found.push({ where: dir, skills: present });
  }
  return found;
}

function installMatt(tool, found) {
  const c = CONFIG[tool];
  log(`\n[${tool}] Matt Pocock's skills`);

  if (found.length > 1) {
    warn("found in more than one place; remove one to avoid duplicates:");
    found.forEach((f) => warn(`  - ${f.where}${f.skills ? ` (${f.skills.join(", ")})` : ""}`));
  }
  const asPlugin = found.find((f) => f.where === "plugin");
  const asFiles = found.filter((f) => f.where !== "plugin");

  if (hasCli(c.cli)) {
    if (asPlugin) {
      if (!c.update) return "present (plugin); Codex has no per-plugin update";
      const r = run(c.cli, c.update(`${matt.pluginName}@${matt.marketplaceName || matt.pluginName}`));
      return r.ok ? "updated (plugin)" : "update failed";
    }
    if (asFiles.length) {
      warn("found as skill files; not installing the plugin on top. Remove the files and rerun to switch to the plugin.");
      return "present (skill files), unchanged";
    }
    const added = run(c.cli, c.marketplaceAdd(matt.repo));
    const inst = added.ok && run(c.cli, c.install(matt.pluginName, matt.marketplaceName || matt.pluginName));
    if (inst && inst.ok) return "installed (plugin)";
    warn("plugin install failed; falling back to the skills CLI");
  }

  let ok = true;
  for (const s of matt.skills) {
    const [cmd, ...rest] = CONFIG.mattFallback(s, CONFIG.mattAgentFlag[tool]);
    ok = run(cmd, rest).ok && ok;
  }
  return ok ? "installed (skill files)" : "partially installed; see output above";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
log(`${pkg.name} v${pkg.version}${dryRun ? " (dry run)" : ""}`);
const tools = ["claude", "codex"].filter((t) => hasCli(CONFIG[t].cli));
if (!tools.length) {
  warn("neither the claude nor the codex CLI was found; using skill-file locations for both");
  tools.push("claude", "codex");
}

if (command === "uninstall") {
  const prior = readManifest();
  tools.forEach(uninstallSelf);
  const anyShared = prior && prior.tools && Object.values(prior.tools).some((t) => t && t.self === "shared");
  if (anyShared && fs.lstatSync(sharedDir, { throwIfNoEntry: false })) {
    if (dryRun) log(`\nremove ${sharedDir}`);
    else {
      fs.rmSync(sharedDir, { recursive: true, force: true });
      log(`\nremoved ${sharedDir}`);
    }
  }
  if (!dryRun && fs.existsSync(CONFIG.manifestFile)) fs.rmSync(CONFIG.manifestFile);
  log(`\nRemoved ${pkg.name}. Matt Pocock's skills were left in place.`);
  process.exit(0);
}

const summary = {};
for (const tool of tools) {
  summary[tool] = { self: (link ? linkSelf(tool) : installSelf(tool)).method };
  const found = findMatt(tool);
  if (withMatt) {
    summary[tool].matt = installMatt(tool, found);
  } else if (!found.length) {
    summary[tool].matt = "missing";
  } else {
    summary[tool].matt = `present (${found.map((f) => f.where).join(", ")})`;
    if (found.length > 1) warn(`[${tool}] Matt's skills found in more than one place: ${found.map((f) => f.where).join(", ")}`);
  }
}

log("\nSummary");
for (const [tool, s] of Object.entries(summary)) {
  log(`  ${tool}: ${pkg.name} via ${s.self}; Matt's skills ${s.matt}`);
}
if (!withMatt && Object.values(summary).some((s) => s.matt === "missing")) {
  log(`\nMatt Pocock's skills are required by dev-build and dev-reviewer. Re-run this installer with --matt to add them.`);
}
log("\nNext: run dev-standards in each repo to generate AGENTS.md and docs/standards.md.");

if (!dryRun) {
  fs.writeFileSync(
    CONFIG.manifestFile,
    JSON.stringify({ version: pkg.version, installedAt: new Date().toISOString(), tools: summary }, null, 2) + "\n"
  );
}
