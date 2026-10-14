import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { exists, git, read, sandbox, tree, write, type Sandbox } from "./helpers.ts";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

const TEAM_FILES = {
  "CLAUDE.md": "# Team instructions for Claude\n",
  "AGENTS.md": "# Team instructions\n\n- Use pnpm.\n",
  "src/index.ts": "export {};\n",
};

const status = (repo: string) => git(repo, ["status", "--porcelain", "--untracked-files=all"]);

test("local-only init leaves git status clean", () => {
  const repo = box.repo(TEAM_FILES);
  const result = box.run(["init", "--local-only"], repo);
  assert.equal(result.status, 0, result.output);

  assert.ok(exists(path.join(repo, ".claude", "skills", "plan", "SKILL.md")));
  assert.ok(exists(path.join(repo, ".agents", "skills", "plan", "SKILL.md")));
  assert.ok(exists(path.join(repo, ".claude", "rules", "dotagents.md")));
  assert.ok(exists(path.join(repo, ".github", "instructions", "dotagents.instructions.md")));
  assert.ok(exists(path.join(repo, ".dotagents.json")));
  assert.equal(status(repo), "");
  assert.match(result.output, /Codex rules aren't installed in local-only mode/);
});

test("local-only init never changes tracked files, and edits to them stay visible", () => {
  const repo = box.repo(TEAM_FILES);
  box.run(["init", "--local-only"], repo);
  assert.equal(read(path.join(repo, "CLAUDE.md")), TEAM_FILES["CLAUDE.md"]);
  assert.equal(read(path.join(repo, "AGENTS.md")), TEAM_FILES["AGENTS.md"]);

  write(path.join(repo, "AGENTS.md"), TEAM_FILES["AGENTS.md"] + "- Run tests with pnpm test.\n");
  assert.equal(status(repo), " M AGENTS.md");
});

test("local-only init refuses to write a tracked path", () => {
  const repo = box.repo({ ...TEAM_FILES, ".claude/rules/dotagents.md": "the team's own file\n" });
  const result = box.run(["init", "--local-only"], repo);
  assert.equal(result.status, 1);
  assert.match(result.output, /dotagents\.md: tracked by Git/);
  assert.equal(read(path.join(repo, ".claude", "rules", "dotagents.md")), "the team's own file\n");
  assert.equal(status(repo), "");
});

test("local-only uninstall restores the repository and .git/info/exclude", () => {
  const repo = box.repo(TEAM_FILES);
  const excludeFile = path.join(repo, ".git", "info", "exclude");
  const excludeBefore = exists(excludeFile) ? read(excludeFile) : "";
  const before = tree(repo);

  box.run(["init", "--local-only"], repo);
  assert.match(read(excludeFile), /# >>> dotagents/);
  const result = box.run(["uninstall", "--project"], repo);
  assert.equal(result.status, 0, result.output);

  assert.deepEqual(tree(repo), before);
  assert.equal(read(excludeFile), excludeBefore);
});

test("project init adds a block to AGENTS.md and leaves files for commit", () => {
  const repo = box.repo(TEAM_FILES);
  const result = box.run(["init"], repo);
  assert.equal(result.status, 0, result.output);

  const agentsMd = read(path.join(repo, "AGENTS.md"));
  assert.ok(agentsMd.startsWith(TEAM_FILES["AGENTS.md"]), "existing content is preserved");
  assert.match(agentsMd, /<!-- dotagents:start -->[\s\S]*<!-- dotagents:end -->\n$/);
  assert.ok(!exists(path.join(repo, ".github", "instructions")), "Copilot uses the AGENTS.md block");

  const changes = status(repo);
  assert.match(changes, /^ M AGENTS\.md$/m);
  assert.match(changes, /^\?\? \.dotagents\.json$/m);
  assert.match(changes, /^\?\? \.claude\/skills\/plan\/SKILL\.md$/m);

  const manifest = JSON.parse(read(path.join(repo, ".dotagents.json")));
  assert.equal(manifest.mode, "project");
  assert.ok(manifest.entries.every((entry: { path: string }) => !path.isAbsolute(entry.path)), "paths are relative");
});

test("project uninstall keeps files that dotagents didn't write", () => {
  const repo = box.repo({ ...TEAM_FILES, ".claude/skills/team-skill/SKILL.md": "team skill\n" });
  box.run(["init"], repo);
  box.run(["uninstall", "--project"], repo);
  assert.equal(read(path.join(repo, ".claude", "skills", "team-skill", "SKILL.md")), "team skill\n");
  assert.equal(read(path.join(repo, "AGENTS.md")), TEAM_FILES["AGENTS.md"]);
  assert.equal(status(repo), "");
});

test("switching modes requires an uninstall first", () => {
  const repo = box.repo(TEAM_FILES);
  box.run(["init", "--local-only"], repo);
  const result = box.run(["init"], repo);
  assert.equal(result.status, 1);
  assert.match(result.output, /already has a local install/);
});

test("init outside a repository fails with a hint", () => {
  const result = box.run(["init"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /Not inside a Git repository/);
});

test("doctor flags a local-only file that became visible to Git", () => {
  const repo = box.repo(TEAM_FILES);
  box.run(["install"]);
  box.run(["init", "--local-only"], repo);
  assert.equal(box.run(["doctor"], repo).status, 0);

  write(path.join(repo, ".git", "info", "exclude"), "");
  const result = box.run(["doctor"], repo);
  assert.equal(result.status, 1);
  assert.match(result.output, /visible to Git in a local-only install/);
});
