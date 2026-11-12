import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { hash } from "../src/manifest.ts";
import { exists, read, sandbox, tree, write, type Sandbox } from "./helpers.ts";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

const p = (...parts: string[]) => path.join(box.home, ...parts);
const installPlugin = () => write(p(".claude", "plugins", "installed_plugins.json"), JSON.stringify({ plugins: { "dotagents@dotagents": [] } }));

test("install writes rules for every agent, and skills for every agent but Claude Code", () => {
  const result = box.run(["install"]);
  assert.equal(result.status, 0, result.output);

  assert.ok(exists(p(".agents", "skills", "dot-plan", "SKILL.md")));
  assert.ok(exists(p(".agents", "skills", "dot-debug", "scripts", "hitl-loop.template.sh")));
  assert.ok(!exists(p(".agents", "skills", "dot-grill-me", "UPSTREAM.json")), "UPSTREAM.json isn't installed");
  assert.ok(!exists(p(".claude", "skills")), "Claude Code gets skills from the plugin");
  const claudeRules = read(p(".claude", "rules", "dotagents.md"));
  assert.match(claudeRules, /## Working agreements[\s\S]*## Code comments[\s\S]*## Ponytail/);
  assert.match(read(p(".codex", "AGENTS.md")), /<!-- dotagents:start -->[\s\S]*Working agreements[\s\S]*<!-- dotagents:end -->/);
  assert.match(read(p(".copilot", "copilot-instructions.md")), /<!-- dotagents:start -->[\s\S]*Working agreements[\s\S]*<!-- dotagents:end -->/);
  assert.ok(exists(p(".config", "dotagents", "manifest.json")));
});

test("install is idempotent", () => {
  box.run(["install"]);
  const before = tree(box.home).map((file) => [file, read(p(file))]);
  const result = box.run(["install"]);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Already up to date/);
  const after = tree(box.home).map((file) => [file, read(p(file))]);
  // Only the manifest's timestamp changes.
  assert.deepEqual(after.filter(([f]) => !f.endsWith("manifest.json")), before.filter(([f]) => !f.endsWith("manifest.json")));
});

test("--agents limits the install", () => {
  box.run(["install", "--agents", "claude"]);
  assert.deepEqual(tree(box.home), [".claude/rules/dotagents.md", ".config/dotagents/manifest.json"]);
  assert.ok(!exists(p(".agents")));
  assert.ok(!exists(p(".codex")));
  assert.ok(!exists(p(".copilot")));
});

test("the Codex block preserves existing AGENTS.md content, and uninstall restores it", () => {
  const original = "# My global rules\n\n- Prefer tabs.\n";
  write(p(".codex", "AGENTS.md"), original);
  box.run(["install"]);
  assert.match(read(p(".codex", "AGENTS.md")), /^# My global rules\n\n- Prefer tabs\.\n\n<!-- dotagents:start -->/);

  const result = box.run(["uninstall"]);
  assert.equal(result.status, 0, result.output);
  assert.equal(read(p(".codex", "AGENTS.md")), original);
});

test("uninstall removes exactly what install wrote", () => {
  write(p(".claude", "skills", "mine", "SKILL.md"), "my own skill");
  write(p(".claude", "settings.json"), "{}");
  const before = tree(box.home);
  box.run(["install"]);
  box.run(["uninstall"]);
  assert.deepEqual(tree(box.home), before);
});

test("an existing file that dotagents didn't write is a conflict", () => {
  write(p(".agents", "skills", "dot-grill-me", "SKILL.md"), "someone else's dot-grill-me");
  const result = box.run(["install"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /dot-grill-me\/SKILL\.md: exists and wasn't written by dotagents/);
  assert.equal(read(p(".agents", "skills", "dot-grill-me", "SKILL.md")), "someone else's dot-grill-me");

  assert.equal(box.run(["install", "--force"]).status, 0);
  assert.match(read(p(".agents", "skills", "dot-grill-me", "SKILL.md")), /name: dot-grill-me/);
});

test("update skips locally modified files unless forced", () => {
  box.run(["install"]);
  const file = p(".agents", "skills", "dot-plan", "SKILL.md");
  write(file, "my edits");

  const result = box.run(["update"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /modified locally, skipped/);
  assert.equal(read(file), "my edits");

  assert.equal(box.run(["update", "--force"]).status, 0);
  assert.match(read(file), /name: dot-plan/);
});

test("update removes skills that left the catalog", () => {
  box.run(["install"]);
  const manifestFile = p(".config", "dotagents", "manifest.json");
  const manifest = JSON.parse(read(manifestFile));
  const stale = p(".claude", "skills", "retired", "SKILL.md");
  write(stale, "retired skill");
  manifest.entries.push({ path: stale, kind: "file", hash: hash("retired skill") });
  write(manifestFile, JSON.stringify(manifest));

  const result = box.run(["update"]);
  assert.equal(result.status, 0, result.output);
  assert.ok(!exists(path.dirname(stale)), "the skill directory is pruned");
});

test("update removes the Claude Code skills that an earlier version installed, and keeps the rules", () => {
  box.run(["install"]);
  const manifestFile = p(".config", "dotagents", "manifest.json");
  const manifest = JSON.parse(read(manifestFile));
  const legacy = p(".claude", "skills", "dot-plan", "SKILL.md");
  write(legacy, "legacy skill");
  manifest.entries.push({ path: legacy, kind: "file", hash: hash("legacy skill") });
  write(manifestFile, JSON.stringify(manifest));

  const result = box.run(["update"]);
  assert.equal(result.status, 0, result.output);
  assert.ok(!exists(p(".claude", "skills", "dot-plan")));
  assert.ok(exists(p(".claude", "rules", "dotagents.md")));
});

test("doctor warns when Claude Code has dotagents skills and the plugin", () => {
  box.run(["install"]);
  write(p(".claude", "skills", "dot-plan", "SKILL.md"), "leftover");
  installPlugin();

  const result = box.run(["doctor"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /dot-plan: Claude Code also loads this skill from the dotagents plugin/);
});

test("--dry-run writes nothing", () => {
  const result = box.run(["install", "--dry-run"]);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /would create/);
  assert.deepEqual(tree(box.home), []);
});

test("install, update, and doctor tell Claude Code users to install the plugin until it's installed", () => {
  assert.match(box.run(["install"]).output, /\/plugin install dotagents@dotagents/);
  assert.match(box.run(["update"]).output, /\/plugin install dotagents@dotagents/);
  const doctor = box.run(["doctor"]);
  assert.equal(doctor.status, 1);
  assert.match(doctor.output, /\/plugin install dotagents@dotagents/);

  installPlugin();
  assert.doesNotMatch(box.run(["update"]).output, /\/plugin install/);
  assert.equal(box.run(["doctor"]).status, 0);
});

test("doctor reports modified and missing files", () => {
  box.run(["install"]);
  installPlugin();
  assert.equal(box.run(["doctor"]).status, 0);
  write(p(".claude", "rules", "dotagents.md"), "edited");
  const result = box.run(["doctor"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /dotagents\.md: modified/);
});

test("check enable and disable change only the repository list in the config", () => {
  box.run(["install", "--source", "github:me/dotagents"]);
  const repo = box.repo();
  const configFile = p(".config", "dotagents", "config.json");

  assert.equal(box.run(["check", "enable"], repo).status, 0);
  assert.deepEqual(JSON.parse(read(configFile)), { checkRepos: [fs.realpathSync(repo)], source: "github:me/dotagents" });
  assert.match(box.run(["doctor"]).output, /The check hook runs in: /);

  assert.equal(box.run(["check", "disable"], repo).status, 0);
  assert.deepEqual(JSON.parse(read(configFile)), { checkRepos: [], source: "github:me/dotagents" });
});

test("check enable --dry-run leaves the config unchanged", () => {
  const repo = box.repo();
  const result = box.run(["check", "enable", "--dry-run"], repo);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /would be enabled/);
  assert.ok(!exists(p(".config", "dotagents", "config.json")));
});

test("a broken config makes doctor name the file", () => {
  box.run(["install"]);
  write(p(".config", "dotagents", "config.json"), "{broken");
  const result = box.run(["doctor"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /config\.json isn't valid JSON: .*Fix or delete it\./);
});

test("check enable fails outside a repository", () => {
  const result = box.run(["check", "enable"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /Not inside a Git repository/);
});
