// Hook for Claude Code, Copilot, and Codex. With `snapshot`, it runs when a
// prompt arrives and records the working tree. Without it, it runs at the end
// of a turn: when the turn changed the tree, it runs the repository's `check`
// script and, when that fails, asks the agent to continue with the output.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MAX_OUTPUT = 4000;

const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
const cwd = input.cwd ?? process.cwd();
const snapshotFile = path.join(os.tmpdir(), "dotagents-check", `${hash(input.session_id ?? cwd)}.txt`);

// Codex needs JSON on stdout when the hook exits 0.
let decision = {};
if (process.argv[2] === "snapshot") saveSnapshot();
else {
  if (!input.stop_hook_active && turnChangedTree() && hasCheckScript()) decision = runCheck();
  fs.rmSync(snapshotFile, { force: true });
}
console.log(JSON.stringify(decision));

function saveSnapshot() {
  const tree = treeHash();
  if (!tree) return;
  fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
  fs.writeFileSync(snapshotFile, tree);
}

// Without a snapshot or Git, a change can't be proven, so the check doesn't run:
// a failing check on untouched code would make the agent edit what nobody asked for.
function turnChangedTree() {
  const tree = treeHash();
  if (!tree || !fs.existsSync(snapshotFile)) return false;
  return fs.readFileSync(snapshotFile, "utf8") !== tree;
}

/** Hashes the working tree, untracked files included and ignored files excluded, without touching the repository's index. */
function treeHash() {
  const index = path.join(os.tmpdir(), `dotagents-index-${process.pid}`);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    // Starting from a copy of the real index reuses its file stat cache, so unchanged files aren't rehashed.
    const realIndex = spawnSync("git", ["rev-parse", "--path-format=absolute", "--git-path", "index"], { cwd, encoding: "utf8" });
    if (realIndex.status === 0 && fs.existsSync(realIndex.stdout.trim())) fs.copyFileSync(realIndex.stdout.trim(), index);
    const add = spawnSync("git", ["add", "--all", "."], { cwd, env, encoding: "utf8" });
    if (add.status !== 0) return undefined;
    const tree = spawnSync("git", ["write-tree"], { cwd, env, encoding: "utf8" });
    return tree.status === 0 ? tree.stdout.trim() : undefined;
  } finally {
    fs.rmSync(index, { force: true });
  }
}

function hasCheckScript() {
  try {
    return Boolean(JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")).scripts?.check);
  } catch {
    return false;
  }
}

function runCheck() {
  const result = spawnSync("npm", ["run", "--silent", "check"], { cwd, encoding: "utf8", shell: process.platform === "win32" });
  if (result.status === 0) return {};
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().slice(-MAX_OUTPUT) || "It printed nothing.";
  return { decision: "block", reason: `\`npm run check\` failed with exit code ${result.status}. Fix the problems your changes caused, then finish:\n${output}` };
}

function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}
