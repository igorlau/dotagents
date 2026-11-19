import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Hashes the working tree, untracked files included and ignored files excluded, without touching the repository's index. */
export function treeHash(cwd) {
  const index = path.join(os.tmpdir(), `dotagents-index-${process.pid}`);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    // Starting from a copy of the real index reuses its file stat cache, so unchanged files aren't rehashed.
    const realIndex = spawnSync(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-path", "index"],
      { cwd, encoding: "utf8" },
    );
    if (realIndex.status === 0 && fs.existsSync(realIndex.stdout.trim()))
      fs.copyFileSync(realIndex.stdout.trim(), index);
    const add = spawnSync("git", ["add", "--all", "."], {
      cwd,
      env,
      encoding: "utf8",
    });
    if (add.status !== 0) return undefined;
    const tree = spawnSync("git", ["write-tree"], {
      cwd,
      env,
      encoding: "utf8",
    });
    return tree.status === 0 ? tree.stdout.trim() : undefined;
  } finally {
    fs.rmSync(index, { force: true });
  }
}

/** Returns the command and arguments that run the repository's `check`: an npm script, else a Makefile target. */
export function checkCommand(cwd) {
  return repoCommand(cwd, "check");
}

/** Returns the command and arguments that run the repository's tests: the npm `test` script, else a Makefile target. */
export function testCommand(cwd) {
  return repoCommand(cwd, "test");
}

function repoCommand(cwd, name) {
  if (hasNpmScript(cwd, name)) return ["npm", "run", "--silent", name];
  if (hasMakeTarget(cwd, name)) return ["make", "--silent", name];
  return undefined;
}

function hasNpmScript(cwd, name) {
  try {
    return Boolean(
      JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"))
        .scripts?.[name],
    );
  } catch {
    return false;
  }
}

function hasMakeTarget(cwd, name) {
  try {
    return new RegExp(`^${name}:`, "m").test(
      fs.readFileSync(path.join(cwd, "Makefile"), "utf8"),
    );
  } catch {
    return false;
  }
}
