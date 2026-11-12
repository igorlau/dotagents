import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";
import { git, sandbox, write, type Sandbox } from "./helpers.ts";

const HOOK = fileURLToPath(new URL("../plugin/hooks/check.mjs", import.meta.url));
const FAILING_CHECK = "node -e \"console.error('type error in a.ts'); process.exit(1)\"";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

function runHook(cwd: string, input: Record<string, unknown>, mode?: "snapshot") {
  const args = mode ? [HOOK, mode] : [HOOK];
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

test("the check hook allows the stop on the retry, so it can't loop", () => {
  const repo = repoWithCheck(FAILING_CHECK);
  assert.deepEqual(turn(repo, editFile(repo), { stop_hook_active: true }), {});
});

test("the check hook leaves the repository's index unchanged", () => {
  const repo = repoWithCheck("node -e 0");
  turn(repo, editFile(repo));
  assert.equal(git(repo, ["status", "--porcelain"]), "?? a.ts");
});
