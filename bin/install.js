#!/usr/bin/env node
// my-dev-skills installer
//
//   npx my-dev-skills init            install or update this plugin for Claude Code and Codex
//   npx my-dev-skills init --matt     also install or update Matt Pocock's skills
//   npx my-dev-skills init --shared   force the ~/.agents copy, even from a checkout
//   npx my-dev-skills init --link     force linking THIS folder, even without a .git
//   npx my-dev-skills uninstall       remove this plugin (leaves Matt's skills alone)
//   --claude, --codex                 install for just that tool, skipping the question
//   --yes, -y                         take every detected tool, skipping the question
//   --dry-run                         show what would run, without running it
//   --help, -h                        this text
//
// On a terminal, `init` shows a checklist of tools, already ticked for the
// ones whose CLI it found: arrows to move, space to toggle, enter to confirm.
// Pipe it, or pass --yes or a tool flag, and it takes the detected tools
// without asking. `uninstall` asks nothing: it removes exactly
// what the record in ~/.my-dev-skills.json says was installed, so a run that
// chose one tool never touches the other.
//
// This installs onto the device rather than through a tool's plugin registry.
// There is one real copy of the plugin and each tool gets a symlink to it:
// full parity on Claude Code (skills, agents and hooks all load through the
// symlink, verified against Claude Code 2.1.267), skills only on Codex (one
// symlink per skill into ~/.agents/skills, the location its own docs name).
// One copy, both tools, and a later `init` refreshes it for both at once.
//
// Where that one copy lives depends on how you run it. From a git checkout,
// the checkout IS the copy and both tools link straight at it, so edits are
// live with no reinstall. Any other way, npx included, it copies to
// ~/.agents/<name> first, because npm deletes its cache after the run and a
// link into it would dangle. --shared forces the copy from a checkout, to
// test exactly what a user gets; --link forces the other way.
// If symlinks aren't possible on this machine, it copies independently per
// tool instead, which loses the hooks and, on Codex, the agents.
//
// It deliberately does NOT register this plugin with a marketplace. If you want
// that instead, run each tool's own commands (`claude plugin marketplace add`
// then `claude plugin install`); the README documents them. Pick one route,
// since the two put files in different places. Matt Pocock's skills are the
// exception: --matt installs them from HIS marketplace, never ours, and never
// twice, since every known location is checked first.


const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const cfg = pkg.devSkills || {};
const matt = cfg.matt || {};
const home = os.homedir();
const sharedDir = path.join(home, ".agents", pkg.name);
let sharedCopyReady = false;
let refusedCount = 0; // entries uninstall declined to delete because we didn't create them

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
// A checkout carries .git (a directory, or a file in a worktree); an npx cache
// doesn't, and npm deletes it after the run, so only a checkout is safe to
// link at directly. --link and --shared override the guess in either direction.
const isCheckout = fs.existsSync(path.join(root, ".git"));
const forceLink = flags.has("--link");
const forceShared = flags.has("--shared");
const link = forceLink || (isCheckout && !forceShared);
const assumeYes = flags.has("--yes") || flags.has("-y");

if (wantsHelp || !["init", "uninstall"].includes(command)) {
  // Ends at the first line that isn't a comment, so adding to the header above can't truncate the help or leak code.
  const lines = fs.readFileSync(__filename, "utf8").split("\n");
  const end = lines.findIndex((l, i) => i > 0 && !l.startsWith("//"));
  console.log(lines.slice(1, end).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
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

// ---------------------------------------------------------------------------
// Choosing tools
// ---------------------------------------------------------------------------
const TOOLS = ["claude", "codex"];
const TOOL_LABEL = { claude: "Claude Code", codex: "Codex" };

// Blocks until one keypress, synchronously, so the rest of this script can stay
// synchronous. Raw mode makes a read return on the first byte; libuv can still
// leave the fd non-blocking, which surfaces as EAGAIN, so retry briefly.
function readKey() {
  const buf = Buffer.alloc(8);
  for (let attempt = 0; attempt < 2000; attempt++) {
    try {
      const n = fs.readSync(0, buf, 0, buf.length, null);
      return n > 0 ? buf.toString("utf8", 0, n) : null; // zero bytes means the stream closed
    } catch (err) {
      if (err.code === "EOF") return null;
      if (err.code !== "EAGAIN") throw err;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); // a 10ms sleep, synchronous
    }
  }
  return null;
}

const ESC = "\x1b";
const KEY = { ctrlC: "\x03", up: ESC + "[A", down: ESC + "[B", enter: "\r", enterLF: "\n", space: " " };

// A checklist: arrows move, space toggles, enter confirms. Returns the chosen
// values, an empty array if everything was unticked, or null if cancelled.
// Throws when the terminal can't do raw mode, so the caller can ask in text.
function checkbox(title, items, preselected) {
  const out = process.stdout;
  const chosen = new Set(preselected);
  let cursor = 0;
  let drawn = 0;

  const draw = () => {
    if (drawn) out.write(ESC + "[" + drawn + "A"); // back to the top of the list
    out.write(ESC + "[0J"); // clear downward, so a redraw never leaves a stale line
    for (let i = 0; i < items.length; i++) {
      const box = chosen.has(items[i].value) ? "[x]" : "[ ]";
      out.write((i === cursor ? " > " : "   ") + box + " " + items[i].label + (items[i].hint || "") + "\n");
    }
    drawn = items.length;
  };

  out.write("\n" + title + "\n  arrows to move, space to toggle, a for all, enter to confirm\n\n");
  process.stdin.setRawMode(true); // throws if this isn't a terminal that supports it
  out.write(ESC + "[?25l"); // hide the cursor while the list redraws
  try {
    draw();
    for (;;) {
      const key = readKey();
      if (key === null || key === KEY.ctrlC || key === ESC) return null; // closed, ctrl-c, or escape
      if (key === KEY.up || key === "k") cursor = (cursor - 1 + items.length) % items.length;
      else if (key === KEY.down || key === "j") cursor = (cursor + 1) % items.length;
      else if (key === KEY.space) {
        const value = items[cursor].value;
        if (chosen.has(value)) chosen.delete(value);
        else chosen.add(value);
      } else if (key === "a" || key === "A") {
        if (chosen.size === items.length) chosen.clear();
        else items.forEach((i) => chosen.add(i.value));
      } else if (key === KEY.enter || key === KEY.enterLF) {
        return items.filter((i) => chosen.has(i.value)).map((i) => i.value);
      }
      draw();
    }
  } finally {
    out.write(ESC + "[?25h"); // show the cursor again, whatever happened
    try {
      process.stdin.setRawMode(false);
    } catch {}
  }
}

// Fallback for a terminal that can't do raw mode: the same choice, typed.
// /dev/tty keeps it working when stdin is piped but stdout is still a terminal.
function askTyped(detected) {
  let fd = 0;
  if (process.platform !== "win32") {
    try {
      fd = fs.openSync("/dev/tty", "r");
    } catch {
      fd = 0;
    }
  }
  const readLine = () => {
    const buf = Buffer.alloc(256);
    for (let attempt = 0; attempt < 400; attempt++) {
      try {
        const n = fs.readSync(fd, buf, 0, buf.length, null);
        return buf.toString("utf8", 0, n).trim();
      } catch (err) {
        if (err.code !== "EAGAIN") return null;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
      }
    }
    return null;
  };

  log("\nInstall for which tools?");
  TOOLS.forEach((t, i) => log(`  ${i + 1}) ${TOOL_LABEL[t]}${detected.includes(t) ? "" : "   (CLI not found)"}`));
  const shown = detected.map((t) => TOOLS.indexOf(t) + 1).join(",");
  const resolve = (tok) => (TOOLS.includes(tok.toLowerCase()) ? tok.toLowerCase() : TOOLS[Number(tok) - 1]);

  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      process.stdout.write(`Numbers or names, comma separated, or "all" [${shown}]: `);
      const answer = readLine();
      if (answer === null) break;
      if (!answer) return detected;
      if (/^(all|both)$/i.test(answer)) return TOOLS.slice();
      const picked = [...new Set(answer.split(/[\s,]+/).filter(Boolean).map(resolve))];
      if (picked.length && !picked.includes(undefined)) return picked;
      warn(`didn't understand "${answer}"`);
    }
  } finally {
    if (fd !== 0) {
      try {
        fs.closeSync(fd);
      } catch {}
    }
  }
  warn(`using the detected tools: ${detected.join(", ")}`);
  return detected;
}

// Which tools to install for. An explicit flag wins, then the checklist, then
// the detected tools, so piped and CI runs behave exactly as they did before.
function chooseTools(detected) {
  const flagged = TOOLS.filter((t) => flags.has(`--${t}`));
  if (flagged.length) return flagged;
  if (assumeYes || !process.stdout.isTTY) return detected;

  if (process.stdin.isTTY) {
    try {
      const items = TOOLS.map((t) => ({
        value: t,
        label: TOOL_LABEL[t],
        hint: detected.includes(t) ? "" : "   (CLI not found)",
      }));
      const picked = checkbox("Install for which tools?", items, detected);
      if (picked === null) {
        log("\nCancelled. Nothing was changed.");
        process.exit(1);
      }
      return picked;
    } catch {
      // Not a terminal that supports raw mode; ask in text instead.
    }
  }
  return askTyped(detected);
}

// ---------------------------------------------------------------------------

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
// How `init` installs: one real copy under ~/.agents/<name>, and each tool gets
// a symlink into it. Same mechanism as --link, pointing at the durable shared
// copy rather than the live checkout. No marketplace is involved.
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
      refusedCount++;
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
if (forceLink && forceShared) warn("--link and --shared contradict each other; using --link");
if (command === "init") {
  log(link ? `  the plugin stays here: ${root}` : `  the plugin is copied to: ${sharedDir}`);
  if (link && !forceLink) log("  (a git checkout, so both tools link straight at it; pass --shared to install the way users do)");
}
const detected = TOOLS.filter((t) => hasCli(CONFIG[t].cli));
if (!detected.length) {
  warn("neither the claude nor the codex CLI was found; offering both, since the files install without them");
  detected.push(...TOOLS);
}

if (command === "uninstall") {
  const prior = readManifest();
  // Remove from what was actually installed, not from whatever is on the machine now:
  // an install that chose one tool must not have the other cleaned up underneath it.
  const installed = prior && prior.tools ? TOOLS.filter((t) => prior.tools[t]) : detected;
  installed.forEach(uninstallSelf);
  const anyShared = prior && prior.tools && Object.values(prior.tools).some((t) => t && t.self === "shared");
  if (anyShared && fs.lstatSync(sharedDir, { throwIfNoEntry: false })) {
    if (dryRun) log(`\nremove ${sharedDir}`);
    else {
      fs.rmSync(sharedDir, { recursive: true, force: true });
      log(`\nremoved ${sharedDir}`);
    }
  }
  // Keep the record when anything was refused, or the install becomes unremovable:
  // without it a later uninstall has no method to act on and does nothing at all.
  if (refusedCount) {
    log(`\nLeft ${refusedCount} ${refusedCount === 1 ? "entry" : "entries"} alone, because this copy of the plugin didn't create ${refusedCount === 1 ? "it" : "them"}.`);
    log(`Kept the install record at ${CONFIG.manifestFile}. Run uninstall from the folder you installed from.`);
    process.exit(1);
  }
  if (!dryRun && fs.existsSync(CONFIG.manifestFile)) fs.rmSync(CONFIG.manifestFile);
  log(`\nRemoved ${pkg.name}. Matt Pocock's skills were left in place.`);
  process.exit(0);
}

const tools = chooseTools(detected);
if (!tools.length) {
  log("\nNothing selected, so nothing was installed.");
  process.exit(0);
}

const summary = {};
for (const tool of tools) {
  summary[tool] = { self: (link ? linkSelf(tool) : sharedSelf(tool)).method };
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
