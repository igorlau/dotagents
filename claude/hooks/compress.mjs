// PostToolUse hook for Claude Code. It shortens the Bash output of test, build,
// install, and Git commands before Claude reads it, and keeps every error line.
// It saves the full output to a file and gives Claude the path. After the first
// browser screenshot of a session, it asks Claude to read the page text first.
// `dotagents compress disable` turns it off.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MIN_CHARS = 1000;
const MIN_SAVING = 0.2;
const MIN_RUN = 4;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ROOT = path.join(os.tmpdir(), "dotagents-compress");
const NUDGE =
  "dotagents: to read a page, use the page text or element queries before a screenshot. Take a screenshot only to check layout or visuals, or when a skill asks for one as evidence.";

const KINDS = [
  ["test", /^(npm|pnpm|yarn|bun)\s+(run\s+)?test\b/],
  ["test", /^(vitest|jest|pytest)\b|^python3?\s+-m\s+pytest\b|^(go|cargo)\s+test\b|^node\s+--test\b|^make\s+test\b/],
  ["build", /^(npm|pnpm|yarn|bun)\s+run\s+(build|lint|check|typecheck)\b|^(tsc|eslint)\b/],
  ["build", /^go\s+(build|vet)\b|^cargo\s+(build|clippy|check)\b|^make\b/],
  ["install", /^(npm|pnpm|yarn|bun)\s+(install|i|ci|add)\b|^pip3?\s+install\b|^uv\s+sync\b/],
  ["git", /^git\s+(status|log|fetch|pull|push|clone)\b/],
];
const PRINTS_FILES = /^(cat|sed|head|tail|grep|rg|awk|jq)\b|^git\s+(diff|show|grep)\b/;
const KEEP = /error|fail|warn|exception|panic|traceback|✗|✖|×|^\s+at\s|^\s*File ".*", line \d+/i;
const PASSED = /^\s*(✓|✔|√|ok\s+\d+\b|PASS\b|--- PASS:|=== RUN\b|# Subtest:)|\sPASSED\b/;
const ANSI = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07/g;

try {
  console.log(JSON.stringify(run(JSON.parse(fs.readFileSync(0, "utf8") || "{}"))));
} catch {
  console.log("{}");
}

function run(input) {
  if (input.hook_event_name !== "PostToolUse" || !input.tool_response || !enabled()) return {};
  const sessionDir = path.join(ROOT, safeName(input.session_id));
  if (input.tool_name === "Bash") return compressBash(input, sessionDir);
  return nudge(input, sessionDir);
}

function enabled() {
  // Same path as configDir() in the CLI's src/paths.ts.
  const configDir = process.env.XDG_CONFIG_HOME
    ? path.join(process.env.XDG_CONFIG_HOME, "dotagents")
    : path.join(os.homedir(), ".config", "dotagents");
  try {
    return JSON.parse(fs.readFileSync(path.join(configDir, "config.json"), "utf8")).compress !== false;
  } catch {
    return true;
  }
}

function compressBash(input, sessionDir) {
  const response = input.tool_response;
  const kind = commandKind(input.tool_input?.command ?? "");
  const stdout = response.stdout ?? "";
  const stderr = response.stderr ?? "";
  const before = stdout.length + stderr.length;
  if (!kind || response.isImage || before < MIN_CHARS) return {};

  const file = path.join(sessionDir, `${safeName(input.tool_use_id)}.log`);
  const newStdout = `${shorten(stdout)}\n[dotagents shortened this output. The full output is in ${file}]`;
  const newStderr = shorten(stderr);
  const after = newStdout.length + newStderr.length;
  if (after > before * (1 - MIN_SAVING)) return {};

  writeFile(file, stderr ? `${stdout}\n--- stderr ---\n${stderr}` : stdout);
  appendStats({ after, before, kind, time: new Date().toISOString() });
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      updatedToolOutput: { ...response, stderr: newStderr, stdout: newStdout },
    },
  };
}

function commandKind(command) {
  const pieces = command.split(/(\|\||&&|;|\||\n)/);
  let kind;
  for (let index = 0; index < pieces.length; index += 2) {
    const filtersPipedOutput = pieces[index - 1] === "|";
    if (filtersPipedOutput) continue;
    const part = pieces[index].trim().replace(/^(\w+=\S*\s+)*/, "").replace(/^(npx|bunx)\s+(-\S+\s+)*/, "");
    if (PRINTS_FILES.test(part)) return undefined;
    kind ??= KINDS.find(([, pattern]) => pattern.test(part))?.[0];
  }
  return kind;
}

function shorten(text) {
  let lines = text
    .replace(ANSI, "")
    .split("\n")
    .map((line) => line.split("\r").filter(Boolean).at(-1) ?? "");
  if (lines.some((line) => KEEP.test(line))) {
    lines = lines.filter((line) => KEEP.test(line) || !PASSED.test(line));
  }
  return collapseRuns(lines).join("\n");
}

function collapseRuns(lines) {
  const shape = (line) => line.trim().replace(/\d+/g, "#");
  const result = [];
  let start = 0;
  while (start < lines.length) {
    let end = start + 1;
    while (end < lines.length && !KEEP.test(lines[start]) && shape(lines[end]) === shape(lines[start])) end++;
    const run = end - start;
    if (shape(lines[start]) === "") {
      result.push("");
    } else if (run >= MIN_RUN) {
      result.push(lines[start], `[${run - 2} similar lines removed]`, lines[end - 1]);
    } else {
      result.push(...lines.slice(start, end));
    }
    start = end;
  }
  return result;
}

function nudge(input, sessionDir) {
  const marker = path.join(sessionDir, "nudged");
  if (!JSON.stringify(input.tool_response).includes('"type":"image"') || fs.existsSync(marker)) return {};
  writeFile(marker, "");
  return { hookSpecificOutput: { additionalContext: NUDGE, hookEventName: "PostToolUse" } };
}

function writeFile(file, content) {
  removeOldSessions();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function removeOldSessions() {
  if (!fs.existsSync(ROOT)) return;
  for (const name of fs.readdirSync(ROOT)) {
    const dir = path.join(ROOT, name);
    if (Date.now() - fs.statSync(dir).mtimeMs > MAX_AGE_MS) fs.rmSync(dir, { force: true, recursive: true });
  }
}

function appendStats(entry) {
  // Same path as stateDir() in the CLI's src/paths.ts.
  const stateDir = process.env.XDG_STATE_HOME
    ? path.join(process.env.XDG_STATE_HOME, "dotagents")
    : path.join(os.homedir(), ".local", "state", "dotagents");
  fs.mkdirSync(stateDir, { recursive: true });
  fs.appendFileSync(path.join(stateDir, "compress.jsonl"), `${JSON.stringify(entry)}\n`);
}

function safeName(name) {
  const text = String(name ?? "unknown");
  return /^[\w-]{1,100}$/.test(text) ? text : crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}
