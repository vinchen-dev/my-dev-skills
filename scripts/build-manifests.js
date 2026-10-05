#!/usr/bin/env node
// Generates the Claude Code and Codex plugin manifests and marketplace files
// from package.json, so name, version and description live in one place.
// Run: npm run manifests

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const cfg = pkg.devSkills || {};
const matt = cfg.matt || {};

const fail = (msg) => {
  console.error(`build-manifests: ${msg}`);
  process.exit(1);
};

// Claude Code refuses to load a plugin whose homepage is not a URL or whose author has no name, so stop here instead.
const repoUrl = ((pkg.repository && pkg.repository.url) || "").replace(/^git\+/, "").replace(/\.git$/, "");
if (!/^https?:\/\//.test(repoUrl)) fail("package.json repository.url must be an http(s) URL");
if (!pkg.author || typeof pkg.author !== "object" || !pkg.author.name) fail("package.json author must be an object with a name");
const ownerRepo = repoUrl.replace(/^.*github\.com[/:]/, "");
const display = cfg.displayName ? { displayName: cfg.displayName } : {};

const skills = fs
  .readdirSync(path.join(root, "skills"), { withFileTypes: true })
  .filter((d) => d.isDirectory() && fs.existsSync(path.join(root, "skills", d.name, "SKILL.md")))
  .map((d) => d.name);

const agents = fs.existsSync(path.join(root, "agents"))
  ? fs.readdirSync(path.join(root, "agents")).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
  : [];

const write = (rel, data) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log("wrote", rel);
};

// Claude Code plugin manifest. skills/ and agents/ at the plugin root are
// auto-discovered, so they are listed here only for readability.
write(".claude-plugin/plugin.json", {
  name: pkg.name,
  ...display,
  version: pkg.version,
  description: pkg.description,
  author: pkg.author,
  homepage: repoUrl,
  repository: repoUrl,
  license: pkg.license,
  keywords: ["workflow", "planning", "verification", "code-review", "skills", ...skills, ...agents],
});

// Claude Code marketplace, listing only this plugin. Matt Pocock's skills are a
// dependency, but they are his to distribute: users add his marketplace and install
// from it, so his updates reach them directly rather than through a copy of his
// entry here. `devSkills.matt` in package.json still drives the installer.
write(".claude-plugin/marketplace.json", {
  name: pkg.name,
  owner: pkg.author,
  metadata: { description: pkg.description, version: pkg.version },
  plugins: [
    {
      name: pkg.name,
      source: "./",
      description: pkg.description,
      version: pkg.version,
      category: "development",
    },
  ],
});

// Codex plugin manifest.
write(".codex-plugin/plugin.json", {
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
  author: pkg.author,
  skills: "./skills/",
});

// Codex marketplace.
write(".agents/plugins/marketplace.json", {
  name: pkg.name,
  ...(cfg.displayName ? { interface: { displayName: cfg.displayName } } : {}),
  plugins: [
    {
      name: pkg.name,
      source: { source: "local", path: "./" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Development",
    },
  ],
});

console.log(`\n${pkg.name}@${pkg.version} — ${skills.length} skills (${skills.join(", ")}), ${agents.length} agents (${agents.join(", ")})`);
if (ownerRepo) console.log(`marketplace add: ${ownerRepo}`);
