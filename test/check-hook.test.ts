import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";
import { git, sandbox, write, type Sandbox } from "./helpers.ts";

const HOOK = fileURLToPath(new URL("../plugin/hooks/check.mjs", import.meta.url));
const RULES_HOOK = fileURLToPath(new URL("../plugin/hooks/rules.mjs", import.meta.url));
const FAILING_CHECK = "node -e \"console.error('type error in a.ts'); process.exit(1)\"";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

function runHook(cwd: string, input: Record<string, unknown>, mode?: "snapshot", hook = HOOK) {
  const args = mode ? [hook, mode] : [hook];
  // The sandbox home holds the opt-in config and, as the temp directory, the snapshots.
  const env = { PATH: process.env.PATH, HOME: box.home, TMPDIR: box.home, TEMP: box.home, TMP: box.home };
  const result = spawnSync(process.execPath, args, { input: JSON.stringify({ cwd, ...input }), encoding: "utf8", env });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

/** Runs one turn: the prompt hook, the agent's edit, then the stop hook. */
function turn(repo: string, edit: () => void, input: Record<string, unknown> = {}) {
  const session = { session_id: randomUUID(), ...input };
  assert.deepEqual(runHook(repo, session, "snapshot"), {});
  edit();
  return runHook(repo, session);
}

/** Creates a repository and opts it in with the CLI, as a user would. */
function enabledRepo(files: Record<string, string> = {}): string {
  const repo = box.repo(files);
  const result = box.run(["check", "enable"], repo);
  assert.equal(result.status, 0, result.output);
  return repo;
}

function repoWithCheck(check: string): string {
  return enabledRepo({ "package.json": JSON.stringify({ scripts: { check } }) });
}

const editFile = (repo: string) => () => write(path.join(repo, "a.ts"), "export const a = 1;\n");

test("the check hook does nothing in a repository that isn't opted in", () => {
  const repo = box.repo({ "package.json": JSON.stringify({ scripts: { check: FAILING_CHECK } }) });
  assert.deepEqual(turn(repo, editFile(repo)), {});
});

test("the check hook does nothing when checkRepos isn't a list", () => {
  const repo = repoWithCheck(FAILING_CHECK);
  write(path.join(box.home, ".config", "dotagents", "config.json"), JSON.stringify({ checkRepos: `${fs.realpathSync(repo)}-and-more` }));
  assert.deepEqual(turn(repo, editFile(repo)), {});
});

test("the check hook stops running after check disable", () => {
  const repo = repoWithCheck(FAILING_CHECK);
  box.run(["check", "disable"], repo);
  assert.deepEqual(turn(repo, editFile(repo)), {});
});

test("the check hook does nothing without a check script", () => {
  const repo = enabledRepo();
  assert.deepEqual(turn(repo, editFile(repo)), {});
});

test("the check hook allows the stop when the check passes", () => {
  const repo = repoWithCheck("node -e 0");
  assert.deepEqual(turn(repo, editFile(repo)), {});
});

test("the check hook blocks the stop with the output when the turn changed files and the check fails", () => {
  const repo = repoWithCheck(FAILING_CHECK);
  const result = turn(repo, editFile(repo));
  assert.equal(result.decision, "block");
  assert.match(result.reason, /type error in a\.ts/);
});

test("the check hook says when the failing check printed nothing", () => {
  const repo = repoWithCheck("node -e \"process.exit(3)\"");
  assert.match(turn(repo, editFile(repo)).reason, /exit code 3[\s\S]*It printed nothing\./);
});

test("the check hook deletes the snapshot at the end of the turn", () => {
  const repo = repoWithCheck("node -e 0");
  turn(repo, editFile(repo));
  assert.deepEqual(fs.readdirSync(path.join(box.home, "dotagents-check")), []);
});

test("the check hook allows the stop when the turn changed nothing, even if the check fails", () => {
  const repo = repoWithCheck(FAILING_CHECK);
  write(path.join(repo, "dirty.ts"), "uncommitted before the turn\n");
  assert.deepEqual(turn(repo, () => {}), {});
});

test("the check hook allows the stop without a snapshot", () => {
  const repo = repoWithCheck(FAILING_CHECK);
  editFile(repo)();
  assert.deepEqual(runHook(repo, { session_id: randomUUID() }), {});
});

test("the check hook warns the user and allows the stop on the retry, so it can't loop", () => {
  const repo = repoWithCheck(FAILING_CHECK);
  const session = { session_id: randomUUID() };
  runHook(repo, session, "snapshot");
  editFile(repo)();
  assert.equal(runHook(repo, session).decision, "block");
  const retry = runHook(repo, { ...session, stop_hook_active: true });
  assert.equal(retry.decision, undefined);
  assert.match(retry.systemMessage, /still fails[\s\S]*type error in a\.ts/);
});

test("the check hook blocks each agent only for the changes that it made", () => {
  const repo = repoWithCheck("node -e \"process.exit(require('fs').existsSync('bad.ts') ? 1 : 0)\"");
  const session = { session_id: randomUUID() };
  const reader = { ...session, agent_id: "reader" };
  const writer = { ...session, agent_id: "writer" };
  runHook(repo, session, "snapshot");
  write(path.join(repo, "bad.ts"), "export const bad = 1;\n");

  runHook(repo, reader, "snapshot");
  assert.deepEqual(runHook(repo, reader), {});

  runHook(repo, writer, "snapshot");
  write(path.join(repo, "worse.ts"), "export const worse = 1;\n");
  assert.equal(runHook(repo, writer).decision, "block");
  assert.match(runHook(repo, { ...writer, stop_hook_active: true }).systemMessage, /still fails/);

  assert.equal(runHook(repo, session).decision, "block");
});

test("the check hook runs the check target of a Makefile", { skip: spawnSync("make", ["--version"]).error ? "make isn't installed" : false }, () => {
  const repo = enabledRepo({ Makefile: "check:\n\t@echo lint error in a.py; exit 1\n" });
  const result = turn(repo, editFile(repo));
  assert.match(result.reason, /`make check` failed[\s\S]*lint error in a\.py/);
});

test("the check hook leaves the repository's index unchanged", () => {
  const repo = repoWithCheck("node -e 0");
  turn(repo, editFile(repo));
  assert.equal(git(repo, ["status", "--porcelain"]), "?? a.ts");
});

test("the rules hook warns only when the installed rules differ from the plugin's rules", () => {
  const session = { session_id: randomUUID() };
  assert.deepEqual(runHook(box.home, session, undefined, RULES_HOOK), {});
  fs.mkdirSync(path.join(box.home, ".claude"));
  assert.match(runHook(box.home, session, undefined, RULES_HOOK).systemMessage, /dotagents install/);
  assert.equal(box.run(["install"]).status, 0);
  assert.deepEqual(runHook(box.home, session, undefined, RULES_HOOK), {});
  const rules = path.join(box.home, ".claude", "rules", "dotagents.md");
  write(rules, fs.readFileSync(rules, "utf8").replace("Working agreements", "Old agreements"));
  assert.match(runHook(box.home, session, undefined, RULES_HOOK).systemMessage, /differ from the rules/);
});
