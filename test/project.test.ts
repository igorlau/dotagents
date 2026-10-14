import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { exists, git, read, sandbox, type Sandbox } from "./helpers.ts";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

const TEAM_FILES = {
  "CLAUDE.md": "# Team instructions for Claude\n",
  "AGENTS.md": "# Team instructions\n\n- Use pnpm.\n",
  "src/index.ts": "export {};\n",
};

const status = (repo: string) => git(repo, ["status", "--porcelain", "--untracked-files=all"]);

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
  assert.match(changes, /^\?\? \.claude\/skills\/dot-plan\/SKILL\.md$/m);

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

test("init outside a repository fails with a hint", () => {
  const result = box.run(["init"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /Not inside a Git repository/);
});

test("a global install run inside a team repository leaves it untouched", () => {
  const repo = box.repo(TEAM_FILES);
  const result = box.run(["install"], repo);
  assert.equal(result.status, 0, result.output);
  assert.equal(status(repo), "");
  assert.ok(!exists(path.join(repo, ".dotagents.json")));
});
