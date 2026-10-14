import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { hash } from "../src/manifest.ts";
import { exists, read, sandbox, tree, write, type Sandbox } from "./helpers.ts";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

const p = (...parts: string[]) => path.join(box.home, ...parts);

test("install writes skills and rules for every agent", () => {
  const result = box.run(["install"]);
  assert.equal(result.status, 0, result.output);

  for (const dir of [".claude/skills", ".agents/skills"]) {
    assert.ok(exists(p(dir, "plan", "SKILL.md")), `${dir}/plan`);
    assert.ok(exists(p(dir, "debug", "scripts", "hitl-loop.template.sh")), `${dir}/debug script`);
    assert.ok(!exists(p(dir, "grill-me", "UPSTREAM.json")), "UPSTREAM.json isn't installed");
  }
  assert.match(read(p(".claude", "rules", "dotagents.md")), /Working agreements/);
  assert.match(read(p(".codex", "AGENTS.md")), /<!-- dotagents:start -->[\s\S]*Working agreements[\s\S]*<!-- dotagents:end -->/);
  assert.match(read(p(".copilot", "instructions", "dotagents.instructions.md")), /^---\napplyTo: "\*\*"\n---/);
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
  assert.ok(exists(p(".claude", "skills", "plan", "SKILL.md")));
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
  write(p(".agents", "skills", "grill-me", "SKILL.md"), "someone else's grill-me");
  const result = box.run(["install"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /grill-me\/SKILL\.md: exists and wasn't written by dotagents/);
  assert.equal(read(p(".agents", "skills", "grill-me", "SKILL.md")), "someone else's grill-me");

  assert.equal(box.run(["install", "--force"]).status, 0);
  assert.match(read(p(".agents", "skills", "grill-me", "SKILL.md")), /name: grill-me/);
});

test("update skips locally modified files unless forced", () => {
  box.run(["install"]);
  const file = p(".claude", "skills", "plan", "SKILL.md");
  write(file, "my edits");

  const result = box.run(["update"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /modified locally, skipped/);
  assert.equal(read(file), "my edits");

  assert.equal(box.run(["update", "--force"]).status, 0);
  assert.match(read(file), /name: plan/);
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

test("--dry-run writes nothing", () => {
  const result = box.run(["install", "--dry-run"]);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /would create/);
  assert.deepEqual(tree(box.home), []);
});

test("doctor reports modified and missing files", () => {
  box.run(["install"]);
  assert.equal(box.run(["doctor"]).status, 0);
  write(p(".claude", "rules", "dotagents.md"), "edited");
  const result = box.run(["doctor"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /dotagents\.md: modified/);
});
