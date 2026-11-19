import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";
import { exists, read, sandbox, write, type Sandbox } from "./helpers.ts";

const GATE = fileURLToPath(new URL("../claude/skills/dot-factory/scripts/gate.mjs", import.meta.url));
const PASS = "node -e \"console.log('passed')\"";
const FAIL = "node -e \"console.error('failed'); process.exit(1)\"";
const ROADMAP = "# Roadmap\n\n- [ ] [1.2 Add the thing](01/02-thing.md) (blocked by: none)\n- [ ] [1.3 Next](01/03-next.md)\n";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

function repoWithScripts(scripts: Record<string, string>): string {
  return box.repo({ "package.json": JSON.stringify({ scripts }) });
}

/** Runs the Gate for a task, with the roadmap and the log outside the repository. */
function runGate(repo: string, task = "1.2") {
  const roadmap = path.join(box.home, "roadmap");
  const log = path.join(box.home, "logs", `gate-${task}-1.log`);
  if (!exists(path.join(roadmap, "README.md"))) write(path.join(roadmap, "README.md"), ROADMAP);
  const result = spawnSync(process.execPath, [GATE, "--task", task, "--roadmap", roadmap, "--log", log], { cwd: repo, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, readme: () => read(path.join(roadmap, "README.md")), log: () => read(log) };
}

test("the gate passes and ticks the task when the check and the tests pass", () => {
  const repo = repoWithScripts({ check: PASS, test: PASS });

  const result = runGate(repo);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^gate pass task=1\.2 tree=[0-9a-f]{40} log=\S+gate-1\.2-1\.log\n$/);
  assert.match(result.readme(), /^- \[x\] \[1\.2 Add the thing\]/m);
  assert.match(result.readme(), /^- \[ \] \[1\.3 Next\]/m);
});

test("the gate ticks a task only once", () => {
  const repo = repoWithScripts({ check: PASS, test: PASS });
  const ticked = runGate(repo).readme();

  const result = runGate(repo);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.readme(), ticked);
  assert.equal(result.readme().match(/- \[x\]/g)?.length, 1);
});

test("the gate passes without a tick for a task id that the roadmap does not list, such as a fix round", () => {
  const repo = repoWithScripts({ check: PASS, test: PASS });

  const result = runGate(repo, "fix-1");

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^gate pass task=fix-1 /);
  assert.equal(result.readme(), ROADMAP);
});

test("the gate fails with reason check and keeps the checkbox when the check fails", () => {
  const repo = repoWithScripts({ check: FAIL, test: PASS });

  const result = runGate(repo);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /^gate fail task=1\.2 tree=[0-9a-f]{40} log=\S+ reason=check\n$/);
  assert.equal(result.readme(), ROADMAP);
});

test("the gate fails with reason test when the tests fail", () => {
  const repo = repoWithScripts({ check: PASS, test: FAIL });

  const result = runGate(repo);

  assert.equal(result.status, 1);
  assert.match(result.stdout, / reason=test\n$/);
  assert.equal(result.readme(), ROADMAP);
});

test("the gate fails with reason no-commands when the repository has neither command", () => {
  const repo = box.repo({ "README.md": "# No scripts\n" });

  const result = runGate(repo);

  assert.equal(result.status, 1);
  assert.match(result.stdout, / reason=no-commands\n$/);
});

test("the gate uses the test target of a Makefile when there is no package.json", () => {
  const repo = box.repo({ Makefile: "test:\n\t@echo make test ran\n" });

  const result = runGate(repo);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.log(), /make test ran/);
});

test("the gate writes the output of both commands to the log file", () => {
  const repo = repoWithScripts({ check: "node -e \"console.log('check output')\"", test: "node -e \"console.error('test output')\"" });

  const log = runGate(repo).log();

  assert.match(log, /npm run --silent check[\s\S]*check output/);
  assert.match(log, /npm run --silent test[\s\S]*test output/);
});

test("the gate prints a tree hash that changes with an untracked file", () => {
  const repo = repoWithScripts({ check: PASS, test: PASS });
  const before = runGate(repo).stdout.match(/tree=(\w+)/)?.[1];
  write(path.join(repo, "new.txt"), "untracked\n");

  const after = runGate(repo).stdout.match(/tree=(\w+)/)?.[1];

  assert.ok(before && after);
  assert.notEqual(after, before);
});

test("the gate passes when a command prints more than 1 MiB", () => {
  const repo = repoWithScripts({ check: PASS, test: "node -e \"process.stdout.write('x'.repeat(2 * 1024 * 1024))\"" });

  const result = runGate(repo);

  assert.equal(result.status, 0, result.stdout);
  assert.match(result.stdout, /^gate pass/);
});
