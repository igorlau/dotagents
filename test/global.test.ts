import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { isInside, isOlderRelease, packageManagerCommand } from "../src/commands.ts";
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
  assert.ok(!exists(p(".agents", "skills", "dot-grilling", "UPSTREAM.json")), "UPSTREAM.json isn't installed");
  assert.ok(!exists(p(".claude", "skills")), "Claude Code gets skills from the plugin");
  const claudeRules = read(p(".claude", "rules", "dotagents.md"));
  assert.match(claudeRules, /## Working agreements[\s\S]*## Code comments[\s\S]*## Ponytail/);
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

const ORIGINAL_CODEX = "# mine\n";
const manifestPath = () => p(".config", "dotagents", "manifest.json");

function installWithOldCodexState(): void {
  box.run(["install"]);
  const body = "old codex rules";
  write(p(".codex", "AGENTS.md"), `${ORIGINAL_CODEX}\n<!-- dotagents:start -->\n${body}\n<!-- dotagents:end -->\n`);
  const manifest = JSON.parse(read(manifestPath()));
  manifest.agents = ["claude", "codex", "copilot"];
  manifest.entries.push({ path: p(".codex", "AGENTS.md"), kind: "block", hash: hash(body) });
  write(manifestPath(), JSON.stringify(manifest));
}

test("update removes the old Codex block, keeps the user content, and drops codex from the manifest", () => {
  installWithOldCodexState();

  const result = box.run(["update"]);

  assert.equal(result.status, 0, result.output);
  assert.equal(read(p(".codex", "AGENTS.md")), ORIGINAL_CODEX);
  assert.deepEqual(JSON.parse(read(manifestPath())).agents, ["claude", "copilot"]);
});

test("update announces the removal when codex was the only agent", () => {
  box.run(["install", "--agents", "claude"]);
  const body = "old codex rules";
  write(p(".codex", "AGENTS.md"), `${ORIGINAL_CODEX}\n<!-- dotagents:start -->\n${body}\n<!-- dotagents:end -->\n`);
  const manifest = JSON.parse(read(manifestPath()));
  manifest.agents = ["codex"];
  manifest.entries.push({ path: p(".codex", "AGENTS.md"), kind: "block", hash: hash(body) });
  write(manifestPath(), JSON.stringify(manifest));

  const result = box.run(["update"]);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /codex is no longer supported\. Removing the global install\./);
  assert.doesNotMatch(result.output, /Updating/);
  assert.ok(!exists(p(".claude", "rules", "dotagents.md")));
  assert.equal(read(p(".codex", "AGENTS.md")), ORIGINAL_CODEX);
});

test("update keeps the install for Claude Code when codex is listed beside it", () => {
  installWithOldCodexState();

  const result = box.run(["update"]);

  assert.match(result.output, /Updating/);
  assert.doesNotMatch(result.output, /no longer supported/);
  assert.ok(exists(p(".claude", "rules", "dotagents.md")));
});

test("uninstall removes the old Codex block from a manifest that lists codex", () => {
  installWithOldCodexState();

  const result = box.run(["uninstall"]);

  assert.equal(result.status, 0, result.output);
  assert.equal(read(p(".codex", "AGENTS.md")), ORIGINAL_CODEX);
});

test("doctor does not fail on a manifest that lists codex", () => {
  installWithOldCodexState();
  installPlugin();

  const result = box.run(["doctor"]);

  assert.equal(result.status, 0, result.output);
  assert.doesNotMatch(result.output, /codex/i);
  assert.doesNotMatch(result.output, /TypeError|Error:/);
});

test("project update removes the old Codex block, keeps the user text, and drops codex from the manifest", () => {
  const userText = "# Team instructions\n\n- Use pnpm.\n";
  const body = "old codex rules";
  const repo = box.repo({ "AGENTS.md": userText, "CLAUDE.md": "# Team instructions for Claude\n" });
  box.run(["init", "--agents", "claude"], repo);
  const agentsFile = path.join(repo, "AGENTS.md");
  const manifestFile = path.join(repo, ".dotagents.json");
  write(agentsFile, `${userText}\n<!-- dotagents:start -->\n${body}\n<!-- dotagents:end -->\n`);
  const manifest = JSON.parse(read(manifestFile));
  manifest.agents = ["claude", "codex"];
  manifest.entries.push({ path: "AGENTS.md", kind: "block", hash: hash(body) });
  write(manifestFile, JSON.stringify(manifest));

  const result = box.run(["update", "--project"], repo);

  assert.equal(result.status, 0, result.output);
  assert.equal(read(agentsFile), userText);
  assert.deepEqual(JSON.parse(read(manifestFile)).agents, ["claude"]);
});

test("install rejects the codex agent", () => {
  const result = box.run(["install", "--agents", "codex"]);

  assert.equal(result.status, 1);
  assert.match(result.output, /Unknown agent "codex"/);
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
  write(p(".agents", "skills", "dot-grilling", "SKILL.md"), "someone else's dot-grilling");
  const result = box.run(["install"]);
  assert.equal(result.status, 1);
  assert.match(result.output, /dot-grilling\/SKILL\.md: exists and wasn't written by dotagents/);
  assert.equal(read(p(".agents", "skills", "dot-grilling", "SKILL.md")), "someone else's dot-grilling");

  assert.equal(box.run(["install", "--force"]).status, 0);
  assert.match(read(p(".agents", "skills", "dot-grilling", "SKILL.md")), /name: dot-grilling/);
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

test("the CLI prints the help and exits 1 with no arguments and no TTY", () => {
  const result = box.run([]);

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /^dotagents: install curated agent skills and rules/);
  assert.deepEqual(tree(box.home), []);
});

test("self-update starts npx directly outside Windows", () => {
  const args = ["--yes", "@igorlau/dotagents@latest", "update", "--global"];

  const command = packageManagerCommand("npx", args, "linux");

  assert.deepEqual(command, { args, command: "npx", shell: false });
});

test("self-update starts npx through the shell with quoted arguments on Windows", () => {
  const command = packageManagerCommand("npx", ["--yes", "C:\\My Repos\\dotagents", "update"], "win32");

  assert.deepEqual(command, { args: [], command: 'npx "--yes" "C:\\My Repos\\dotagents" "update"', shell: true });
});

test("self-update installs with npm through the shell on Windows", () => {
  const command = packageManagerCommand("npm", ["install", "--global", "@igorlau/dotagents@latest"], "win32");

  assert.deepEqual(command, { args: [], command: 'npm "install" "--global" "@igorlau/dotagents@latest"', shell: true });
});

test("self-update uses npm only when the CLI runs from the global node_modules of npm", () => {
  const globalRoot = path.join(path.sep, "usr", "lib", "node_modules");

  assert.equal(isInside(path.join(globalRoot, "@igorlau", "dotagents"), globalRoot), true);
  assert.equal(isInside(path.join(path.sep, "home", "me", ".npm", "_npx", "abc", "node_modules", "@igorlau", "dotagents"), globalRoot), false);
  assert.equal(isInside(path.join(path.sep, "usr", "lib", "node_modules_old", "dotagents"), globalRoot), false);
  assert.equal(isInside(globalRoot, globalRoot), false);
  assert.equal(isInside(path.join(globalRoot, "@igorlau", "dotagents"), undefined), false);
});

test("a release older than the installed release is older, and a build from a branch never is", () => {
  assert.equal(isOlderRelease("1.0.16", "1.0.20"), true);
  assert.equal(isOlderRelease("1.0.9", "1.0.10"), true);
  assert.equal(isOlderRelease("1.0.20", "1.0.20"), false);
  assert.equal(isOlderRelease("2.0.0", "1.9.9"), false);
  assert.equal(isOlderRelease("1.0.0-dev+abc1234", "1.0.20"), false);
  assert.equal(isOlderRelease("1.0.20", "1.1.0-dev+abc1234"), false);
});

test("self-update refuses an argument that cmd.exe would change on Windows", () => {
  assert.throws(() => packageManagerCommand("npx", ["--yes", "%TEMP%\\dotagents"], "win32"), /Remove the " and % characters/);
  assert.throws(() => packageManagerCommand("npm", ['a"b'], "win32"), /Remove the " and % characters/);
});
