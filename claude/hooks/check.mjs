// Hook for Claude Code and Copilot. With `snapshot`, it runs when a
// prompt arrives or a subagent starts, and records the working tree. Without
// it, it runs when the agent or the subagent stops: when that agent changed
// the tree, it runs the repository's `check` script and, when that fails,
// asks the agent to continue with the output. A check that still fails on
// the retry becomes a warning for the user, so the hook can't loop.
// It acts only in repositories that `dotagents check enable` added to the
// user's config, because the `check` script is the repository's own code.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkCommand, treeHash } from "./repo-commands.mjs";

const MAX_OUTPUT = 4000;

const input = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
const cwd = input.cwd ?? process.cwd();
// A subagent has its own snapshot, so each agent answers only for the changes that it made.
const snapshotFile = path.join(
  os.tmpdir(),
  "dotagents-check",
  `${hash(input.agent_id ?? input.session_id ?? cwd)}.txt`,
);

let decision = {};
if (checkEnabled()) {
  if (process.argv[2] === "snapshot") {
    saveSnapshot();
  } else {
    const command = turnChangedTree() && checkCommand(cwd);
    if (command) {
      decision = runCheck(command);
    }
    // A blocked agent stops again, and that retry needs the snapshot.
    if (decision.decision !== "block") {
      fs.rmSync(snapshotFile, { force: true });
    }
  }
}
console.log(JSON.stringify(decision));

function checkEnabled() {
  const top = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  });
  if (top.status !== 0) {
    return false;
  }
  // Same path as configDir() in the CLI's src/paths.ts.
  const configDir = process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, "dotagents")
    : path.join(os.homedir(), ".config", "dotagents");
  try {
    const { checkRepos = [] } = JSON.parse(
      fs.readFileSync(path.join(configDir, "config.json"), "utf8"),
    );
    return (
      Array.isArray(checkRepos) &&
      checkRepos.includes(fs.realpathSync(top.stdout.trim()))
    );
  } catch {
    return false;
  }
}

function saveSnapshot() {
  const tree = treeHash(cwd);
  if (!tree) return;
  fs.mkdirSync(path.dirname(snapshotFile), { recursive: true });
  fs.writeFileSync(snapshotFile, tree);
}

// Without a snapshot or Git, a change can't be proven, so the check doesn't run:
// a failing check on untouched code would make the agent edit what nobody asked for.
function turnChangedTree() {
  const tree = treeHash(cwd);
  if (!tree || !fs.existsSync(snapshotFile)) return false;
  return fs.readFileSync(snapshotFile, "utf8") !== tree;
}

function runCheck([command, ...args]) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  // A runner that isn't installed can't prove a failure.
  if (result.status === 0 || result.error) return {};
  const output =
    `${result.stdout ?? ""}${result.stderr ?? ""}`.trim().slice(-MAX_OUTPUT) ||
    "It printed nothing.";
  const failure = `\`${[command, ...args.filter((arg) => arg !== "--silent")].join(" ")}\` failed with exit code ${result.status}.`;
  if (input.stop_hook_active)
    return {
      systemMessage: `${failure} The agent already tried to fix it, so the check still fails:\n${output}`,
    };
  return {
    decision: "block",
    reason: `${failure} Fix the problems that your changes caused, then finish. If a problem was there before your changes, leave it and tell the user:\n${output}`,
  };
}

function hash(text) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}
