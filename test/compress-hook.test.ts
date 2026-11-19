import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";
import { read, sandbox, write, type Sandbox } from "./helpers.ts";

const HOOK = fileURLToPath(new URL("../claude/hooks/compress.mjs", import.meta.url));
const uniqueWord = (index: number) => `${"abcdefghijklmnopqrstuvwxyz"[index % 26]}${"xyz"[Math.floor(index / 26)]}`;
const PASSING_LINES = Array.from({ length: 60 }, (_, index) => ` ✓ src/a.test.ts > adds case ${uniqueWord(index)} 2ms`);
const FAILING_RUN = [
  ...PASSING_LINES,
  " × src/a.test.ts > rejects an empty name 3ms",
  "AssertionError: expected 1 to be 2",
  "    at src/a.test.ts:12:7",
  " Tests  1 failed | 60 passed (61)",
].join("\n");

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

function runHook(input: Record<string, unknown>) {
  // The sandbox home is also the temp directory, so the saved outputs stay in the sandbox.
  const env = { PATH: process.env.PATH, HOME: box.home, TMPDIR: box.home, TEMP: box.home, TMP: box.home };
  const result = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(input), encoding: "utf8", env });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function bash(command: string, stdout: string, stderr = "", session_id = randomUUID()) {
  return runHook({
    hook_event_name: "PostToolUse",
    session_id,
    tool_input: { command },
    tool_name: "Bash",
    tool_response: { interrupted: false, isImage: false, noOutputExpected: false, stderr, stdout },
    tool_use_id: `toolu_${randomUUID().replaceAll("-", "")}`,
  });
}

function browser(session_id: string, content: unknown[]) {
  return runHook({
    hook_event_name: "PostToolUse",
    session_id,
    tool_input: {},
    tool_name: "mcp__claude-in-chrome__computer",
    tool_response: content,
    tool_use_id: "toolu_browser",
  });
}

const compressDir = () => path.join(box.home, "dotagents-compress");
const statsFile = () => path.join(box.home, ".local", "state", "dotagents", "compress.jsonl");

test("the compress hook keeps every failure line and stack frame, and drops the passing tests", () => {
  const { stdout } = bash("npm test", FAILING_RUN).hookSpecificOutput.updatedToolOutput;
  assert.match(stdout, /× src\/a\.test\.ts > rejects an empty name/);
  assert.match(stdout, /AssertionError: expected 1 to be 2\n {4}at src\/a\.test\.ts:12:7/);
  assert.match(stdout, /1 failed \| 60 passed/);
  assert.doesNotMatch(stdout, /adds case/);
});

test("the compress hook leaves output under 1,000 characters unchanged", () => {
  assert.deepEqual(bash("npm test", FAILING_RUN.slice(-900)), {});
});

test("the compress hook leaves output unchanged when it would save less than 20%", () => {
  const unique = Array.from({ length: 40 }, (_, index) => `compiled module ${uniqueWord(index)} in place`);
  const repeated = Array.from({ length: 10 }, () => "waiting for the type checker to finish");
  assert.deepEqual(bash("npm run build", [...unique, ...repeated].join("\n")), {});
});

test("the compress hook never touches commands that print file content", () => {
  const repeated = Array.from({ length: 200 }, () => "same line").join("\n");
  assert.deepEqual(bash("cat notes.txt", repeated), {});
  assert.deepEqual(bash("npm test && cat notes.txt", repeated), {});
  assert.deepEqual(bash("ls -R", repeated), {});
  assert.ok(bash("cd app && CI=1 npm test 2>&1 | tail -80", FAILING_RUN).hookSpecificOutput);
});

test("the compress hook removes ANSI codes and old progress frames, and collapses repeated lines with a count", () => {
  const progress = Array.from({ length: 50 }, (_, index) => `\x1b[32mdownloaded ${index}/50\x1b[0m`).join("\r");
  const fetched = Array.from({ length: 80 }, (_, index) => `fetched package-${index}`).join("\n");
  const { stdout } = bash("npm install", `${progress}\n${fetched}\n\n\n\nadded 80 packages`).hookSpecificOutput.updatedToolOutput;
  assert.doesNotMatch(stdout, /\x1b/);
  assert.match(stdout, /^downloaded 49\/50\nfetched package-0\n\[78 similar lines removed\]\nfetched package-79\n\nadded 80 packages\n/);
});

test("the compress hook shortens stdout and stderr, and keeps the shape of the Bash output", () => {
  const output = bash("npx vitest run", "", FAILING_RUN).hookSpecificOutput.updatedToolOutput;
  assert.deepEqual(Object.keys(output).sort(), ["interrupted", "isImage", "noOutputExpected", "stderr", "stdout"]);
  assert.match(output.stderr, /AssertionError/);
  assert.doesNotMatch(output.stderr, /adds case/);
});

test("the compress hook saves the full output, gives its path, and writes a stats line", () => {
  const { stdout } = bash("npm test", FAILING_RUN, "warning: slow test").hookSpecificOutput.updatedToolOutput;
  const file = stdout.match(/The full output is in (\S+)\]$/)?.[1] ?? "";
  assert.equal(read(file), `${FAILING_RUN}\n--- stderr ---\nwarning: slow test`);
  const [stats, ...more] = read(statsFile()).trim().split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(more, []);
  assert.equal(stats.kind, "test");
  assert.equal(stats.before, FAILING_RUN.length + "warning: slow test".length);
  assert.ok(stats.after < stats.before * 0.8);
});

test("the compress hook does nothing after compress disable, or with Copilot input", () => {
  assert.equal(box.run(["compress", "disable"]).status, 0);
  assert.deepEqual(bash("npm test", FAILING_RUN), {});
  assert.equal(box.run(["compress", "enable"]).status, 0);
  assert.deepEqual(runHook({ toolArgs: "{}", toolName: "bash", toolResult: { textResultForLlm: FAILING_RUN } }), {});
});

test("the compress hook asks for page text once in each session, only after a browser screenshot", () => {
  const session = randomUUID();
  const screenshot = [{ data: "iVBORw0KGgo=", mimeType: "image/png", type: "image" }];
  assert.deepEqual(browser(session, [{ text: "clicked", type: "text" }]), {});
  assert.match(browser(session, screenshot).hookSpecificOutput.additionalContext, /page text/);
  assert.deepEqual(browser(session, screenshot), {});
  assert.ok(browser(randomUUID(), screenshot).hookSpecificOutput);
});

test("the compress hook deletes the session folders older than 7 days and keeps the newer ones", () => {
  const old = path.join(compressDir(), "old-session");
  const recent = path.join(compressDir(), "recent-session");
  write(path.join(old, "a.log"), "old");
  write(path.join(recent, "a.log"), "recent");
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  fs.utimesSync(old, eightDaysAgo, eightDaysAgo);
  bash("npm test", FAILING_RUN);
  assert.equal(fs.existsSync(old), false);
  assert.equal(fs.existsSync(recent), true);
});

test("compress shows the state and the savings for each command kind", () => {
  assert.match(box.run(["compress"]).output, /enabled[\s\S]*not shortened any output yet/);
  bash("npm test", FAILING_RUN);
  bash("pytest -q", FAILING_RUN);
  box.run(["compress", "disable"]);
  const { output } = box.run(["compress"]);
  assert.match(output, /disabled/);
  assert.match(output, /test: 2 calls, \d+ characters shortened to \d+, \d+% saved\./);
});
