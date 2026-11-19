import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, test } from "node:test";
import { git, read, sandbox, write, type Sandbox } from "./helpers.ts";

const SCRIPT = fileURLToPath(new URL("../claude/skills/dot-factory/scripts/review-loop.mjs", import.meta.url));
const BEFORE_FIX = "1\n2\n3\n4\n5\n";
const AFTER_FIX = "1\nTWO\n3\n4\n5\n6\n7\n";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

function runLoop(repo: string, args: string[]) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: repo, encoding: "utf8" });
  return { status: result.status, stderr: result.stderr, json: () => JSON.parse(result.stdout) };
}

function commit(repo: string, files: Record<string, string | null>): string {
  for (const [rel, content] of Object.entries(files)) {
    if (content === null) fs.rmSync(path.join(repo, rel));
    else write(path.join(repo, rel), content);
  }
  git(repo, ["add", "-A"]);
  git(repo, ["-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-q", "-m", "change"]);
  return git(repo, ["rev-parse", "HEAD^{tree}"]);
}

describe("scope", () => {
  function scope(before: Record<string, string>, after: Record<string, string | null>) {
    const repo = box.repo(before);
    const oldTree = git(repo, ["rev-parse", "HEAD^{tree}"]);
    const newTree = commit(repo, after);
    return runLoop(repo, ["scope", oldTree, newTree]);
  }

  test("lists the added and changed line ranges of each file", () => {
    const result = scope({ "a.txt": BEFORE_FIX }, { "a.txt": AFTER_FIX, "b.txt": "x\ny\nz\n" });

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.json().files, ["a.txt", "b.txt"]);
    assert.deepEqual(result.json().changedLines, { "a.txt": [[2, 2], [6, 7]], "b.txt": [[1, 3]] });
    assert.equal(result.json().lines, 7);
  });

  test("records a pure deletion as the line after it", () => {
    const result = scope({ "a.txt": BEFORE_FIX }, { "a.txt": "1\n2\n4\n5\n" });

    assert.deepEqual(result.json().changedLines, { "a.txt": [[3, 3]] });
  });

  test("leaves out a file that the new tree deletes", () => {
    const result = scope({ "a.txt": BEFORE_FIX, "b.txt": "x\n" }, { "b.txt": null });

    assert.deepEqual(result.json().files, ["b.txt"]);
    assert.deepEqual(result.json().changedLines, {});
  });

  test("prints empty results when the trees are equal", () => {
    const repo = box.repo({ "a.txt": BEFORE_FIX });
    const tree = git(repo, ["rev-parse", "HEAD^{tree}"]);

    const result = runLoop(repo, ["scope", tree, tree]);

    assert.deepEqual(result.json(), { files: [], lines: 0, changedLines: {}, lenses: [], ui: false });
  });

  test("selects requirements, code, and docs, without security, for a diff of markdown files", () => {
    const result = scope({ "README.md": "# A\n" }, { "README.md": "# B\n" });

    assert.deepEqual(result.json().lenses, ["requirements", "code", "docs"]);
    assert.equal(result.json().ui, false);
  });

  test("adds the ux lens and ui for a tsx file", () => {
    const result = scope({ "a.txt": BEFORE_FIX }, { "src/App.tsx": "export const App = () => null;\n" });

    assert.deepEqual(result.json().lenses, ["requirements", "code", "security", "ux"]);
    assert.equal(result.json().ui, true);
  });

  test("exits 1 when a tree does not exist", () => {
    const repo = box.repo({ "a.txt": BEFORE_FIX });

    const result = runLoop(repo, ["scope", "HEAD", "0".repeat(40)]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /failed/);
  });
});

describe("apply and accept", () => {
  type Finding = { file: string; line: number; class: string; severity?: string };

  /** A repository whose fix range changes line 2 of a.txt and adds lines 6 and 7. */
  function makeRun() {
    const repo = box.repo({ "a.txt": BEFORE_FIX });
    const oldTree = git(repo, ["rev-parse", "HEAD^{tree}"]);
    const newTree = commit(repo, { "a.txt": AFTER_FIX });
    const ledger = path.join(box.home, "ledger.json");
    let reviews = 0;
    const apply = (round: number, findings: Finding[], previous?: { id: string; status: string }[]) => {
      const review = path.join(box.home, `review-${reviews++}.json`);
      const full = findings.map((finding) => ({ lens: "code", severity: "medium", summary: "s", fix: "f", ...finding }));
      write(review, JSON.stringify({ lenses: ["code"], findings: full, ...(previous && { previous }) }));
      const range = round === 0 ? [] : ["--old", oldTree, "--new", newTree];
      return runLoop(repo, ["apply", "--ledger", ledger, "--review", review, "--round", String(round), ...range]);
    };
    return { repo, ledger, apply };
  }

  test("sends every finding at every severity to the round 1 fix", () => {
    const { apply } = makeRun();

    const result = apply(0, ["high", "medium", "low"].map((severity, i) => ({ file: "a.txt", line: i + 1, class: "logic", severity })));

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.json().action, "fix");
    assert.deepEqual(result.json().findings.map((finding: { id: string; severity: string }) => [finding.id, finding.severity]), [["F1", "high"], ["F2", "medium"], ["F3", "low"]]);
  });

  test("returns done when the first review has no findings", () => {
    const { apply } = makeRun();

    const result = apply(0, []);

    assert.equal(result.json().action, "done");
  });

  test("drops a new finding outside the lines that the fix changed", () => {
    const { apply, ledger } = makeRun();
    apply(0, [{ file: "a.txt", line: 2, class: "logic" }]);

    const result = apply(1, [{ file: "a.txt", line: 4, class: "naming" }], [{ id: "F1", status: "fixed" }]);

    assert.equal(result.json().action, "done");
    assert.equal(JSON.parse(read(ledger)).entries.length, 1);
  });

  test("escalates when a fine key comes back after a fix", () => {
    const { apply } = makeRun();
    apply(0, [{ file: "a.txt", line: 2, class: "logic" }]);

    const result = apply(1, [{ file: "a.txt", line: 2, class: "logic" }], [{ id: "F1", status: "fixed" }]);

    assert.equal(result.json().action, "escalate");
    assert.match(result.json().reason, /a\.txt:2:logic of F1/);
  });

  test("escalates when a coarse key comes back on a line that the fix changed", () => {
    const { apply } = makeRun();
    apply(0, [{ file: "a.txt", line: 2, class: "logic" }]);

    const result = apply(1, [{ file: "a.txt", line: 6, class: "logic" }], [{ id: "F1", status: "fixed" }]);

    assert.equal(result.json().action, "escalate");
    assert.match(result.json().reason, /a\.txt:logic of F1/);
  });

  test("runs another fix round for a docs-style coarse key match", () => {
    const { apply } = makeRun();
    apply(0, [{ file: "a.txt", line: 2, class: "docs-style" }, { file: "a.txt", line: 3, class: "logic" }]);

    const result = apply(1, [{ file: "a.txt", line: 6, class: "docs-style" }], [{ id: "F1", status: "fixed" }, { id: "F2", status: "fixed" }]);

    assert.equal(result.json().action, "fix");
    assert.deepEqual(result.json().findings.map((finding: { id: string }) => finding.id), ["F3"]);
  });

  test("returns the ledger history of the changed lines", () => {
    const { apply } = makeRun();
    apply(0, [{ file: "a.txt", line: 2, class: "logic" }, { file: "a.txt", line: 4, class: "naming" }]);

    const result = apply(1, [], [{ id: "F1", status: "fixed" }, { id: "F2", status: "open" }]);

    assert.deepEqual(result.json().history.map((entry: { id: string; status: string }) => [entry.id, entry.status]), [["F1", "fixed"]]);
    assert.deepEqual(result.json().findings.map((finding: { id: string }) => finding.id), ["F2"]);
  });

  test("escalates when the open count does not go down", () => {
    const { apply } = makeRun();
    apply(0, [{ file: "a.txt", line: 2, class: "logic" }]);

    const result = apply(1, [], [{ id: "F1", status: "open" }]);

    assert.equal(result.json().action, "escalate");
    assert.match(result.json().reason, /open count 1 is not lower than 1/);
  });

  test("escalates the open findings after the review-only round", () => {
    const { apply } = makeRun();
    apply(0, [{ file: "a.txt", line: 2, class: "logic" }, { file: "a.txt", line: 3, class: "naming" }]);

    const result = apply(4, [], [{ id: "F1", status: "fixed" }, { id: "F2", status: "open" }]);

    assert.equal(result.json().action, "escalate");
    assert.equal(result.json().reason, "cap");
    assert.deepEqual(result.json().findings.map((finding: { id: string }) => finding.id), ["F2"]);
  });

  test("marks the open findings accepted", () => {
    const { apply, ledger, repo } = makeRun();
    apply(0, [{ file: "a.txt", line: 2, class: "logic" }, { file: "a.txt", line: 3, class: "naming" }]);

    const result = runLoop(repo, ["accept", "--ledger", ledger]);

    assert.deepEqual(result.json().accepted.map((entry: { id: string }) => entry.id), ["F1", "F2"]);
    assert.deepEqual(JSON.parse(read(ledger)).entries.map((entry: { status: string }) => entry.status), ["accepted", "accepted"]);
  });

  test("keeps the ledger unchanged when the review file does not parse", () => {
    const { apply, ledger, repo } = makeRun();
    apply(0, [{ file: "a.txt", line: 2, class: "logic" }]);
    const before = read(ledger);
    const review = path.join(box.home, "broken.json");
    write(review, "{ not json");

    const result = runLoop(repo, ["apply", "--ledger", ledger, "--review", review, "--round", "1", "--old", "HEAD~1", "--new", "HEAD"]);

    assert.equal(result.status, 1);
    assert.equal(read(ledger), before);
  });
});
