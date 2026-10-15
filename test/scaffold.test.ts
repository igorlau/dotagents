import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { exists, read, sandbox, tree, write, type Sandbox } from "./helpers.ts";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

const SCAFFOLD = [".claude/settings.json", ".editorconfig", ".gitattributes", "AGENTS.md", "CLAUDE.md"];

test("scaffold creates the starter files without a manifest", () => {
  const repo = box.repo();
  const result = box.run(["scaffold"], repo);
  assert.equal(result.status, 0, result.output);

  assert.deepEqual(tree(repo), SCAFFOLD);
  assert.equal(read(path.join(repo, "CLAUDE.md")), "@AGENTS.md\n");
  assert.ok(JSON.parse(read(path.join(repo, ".claude", "settings.json"))).permissions.deny.includes("Read(.env)"));
});

test("scaffold leaves existing files alone, and update and uninstall ignore its files", () => {
  const repo = box.repo({ "AGENTS.md": "# Team instructions\n" });
  const result = box.run(["scaffold"], repo);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /AGENTS\.md: exists and wasn't written by dotagents/);
  assert.equal(read(path.join(repo, "AGENTS.md")), "# Team instructions\n");
  assert.ok(exists(path.join(repo, "CLAUDE.md")), "other files are still created");

  box.run(["init"], repo);
  box.run(["uninstall", "--project"], repo);
  assert.deepEqual(tree(repo), SCAFFOLD);
});

test("scaffold --force overwrites, and --agents skips Claude Code files", () => {
  const repo = box.repo();
  write(path.join(repo, ".editorconfig"), "root = false\n");
  box.run(["scaffold", "--force", "--agents", "codex"], repo);
  assert.match(read(path.join(repo, ".editorconfig")), /^root = true$/m);
  assert.deepEqual(tree(repo), [".editorconfig", ".gitattributes", "AGENTS.md"]);
});
