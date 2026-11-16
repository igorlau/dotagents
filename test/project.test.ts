import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { exists, git, read, sandbox, write, type Sandbox } from "./helpers.ts";

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

const IMPORTING_TEAM_FILES = { ...TEAM_FILES, "CLAUDE.md": "# Team instructions for Claude\n\n@AGENTS.md\n" };
const blockCount = (repo: string) => read(path.join(repo, "AGENTS.md")).split("<!-- dotagents:start -->").length - 1;
const claudeRulesFile = (repo: string) => path.join(repo, ".claude", "rules", "dotagents.md");

test("init writes the rules only in the AGENTS.md block when CLAUDE.md imports AGENTS.md", () => {
  const repo = box.repo(IMPORTING_TEAM_FILES);

  const result = box.run(["init"], repo);

  assert.equal(result.status, 0, result.output);
  assert.equal(blockCount(repo), 1);
  assert.ok(!exists(claudeRulesFile(repo)));
});

test("init for Claude Code alone writes the AGENTS.md block when CLAUDE.md imports AGENTS.md", () => {
  const repo = box.repo(IMPORTING_TEAM_FILES);

  const result = box.run(["init", "--agents", "claude"], repo);

  assert.equal(result.status, 0, result.output);
  assert.equal(blockCount(repo), 1);
  assert.ok(!exists(claudeRulesFile(repo)));
});

test("update removes .claude/rules/dotagents.md after CLAUDE.md starts to import AGENTS.md", () => {
  const repo = box.repo(TEAM_FILES);
  box.run(["init"], repo);
  write(path.join(repo, "CLAUDE.md"), IMPORTING_TEAM_FILES["CLAUDE.md"]);

  const update = box.run(["update", "--project"], repo);
  const doctor = box.run(["doctor"], repo);

  assert.equal(update.status, 0, update.output);
  assert.ok(!exists(claudeRulesFile(repo)));
  assert.equal(blockCount(repo), 1);
  assert.equal(doctor.status, 0, doctor.output);
  assert.match(doctor.output, /No problems found/);
});

test("init keeps .claude/rules/dotagents.md when CLAUDE.md does not import AGENTS.md", () => {
  const repo = box.repo(TEAM_FILES);

  const result = box.run(["init", "--agents", "claude"], repo);

  assert.equal(result.status, 0, result.output);
  assert.ok(exists(claudeRulesFile(repo)));
  assert.equal(blockCount(repo), 0);
});

test("init writes the Claude Code rules only in the AGENTS.md block when the repository has no CLAUDE.md", () => {
  const repo = box.repo({ "AGENTS.md": TEAM_FILES["AGENTS.md"] });

  const result = box.run(["init", "--agents", "claude"], repo);

  assert.equal(result.status, 0, result.output);
  assert.equal(blockCount(repo), 1);
  assert.ok(!exists(claudeRulesFile(repo)));
});

test("init keeps .claude/rules/dotagents.md when the repository has a CLAUDE.local.md", () => {
  const repo = box.repo({ "CLAUDE.local.md": "# My notes\n" });

  const result = box.run(["init", "--agents", "claude"], repo);

  assert.equal(result.status, 0, result.output);
  assert.ok(exists(claudeRulesFile(repo)));
});

test("init keeps .claude/rules/dotagents.md when the repository has a .claude/CLAUDE.md", () => {
  const repo = box.repo({ ".claude/CLAUDE.md": "# Team instructions for Claude\n" });

  const result = box.run(["init", "--agents", "claude"], repo);

  assert.equal(result.status, 0, result.output);
  assert.ok(exists(claudeRulesFile(repo)));
});

test("doctor reports the rules file when a CLAUDE.md appears after a project install without one", () => {
  const repo = box.repo({ "AGENTS.md": TEAM_FILES["AGENTS.md"] });
  box.run(["init", "--agents", "claude"], repo);
  write(path.join(repo, "CLAUDE.md"), TEAM_FILES["CLAUDE.md"]);

  const result = box.run(["doctor"], repo);

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /rules[/\\]dotagents\.md: not installed\. Run `dotagents update`\./);
});

test("update says that Claude Code reads the rules from AGENTS.md when it removes the rules file", () => {
  const repo = box.repo(TEAM_FILES);
  box.run(["init", "--agents", "claude"], repo);
  git(repo, ["rm", "-q", "CLAUDE.md"]);

  const result = box.run(["update", "--project"], repo);

  assert.equal(result.status, 0, result.output);
  assert.ok(!exists(claudeRulesFile(repo)));
  assert.match(result.output, /Claude Code now reads the rules from AGENTS\.md\./);
});
