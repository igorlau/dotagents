import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function git(cwd: string, args: string[]): { status: number; stdout: string } {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, stdout: result.stdout.trim() };
}

export function repoRoot(cwd: string): string | undefined {
  const result = git(cwd, ["rev-parse", "--show-toplevel"]);
  return result.status === 0 ? result.stdout : undefined;
}

export function isTracked(root: string, rel: string): boolean {
  return git(root, ["ls-files", "--", rel]).stdout !== "";
}

export function isIgnored(root: string, rel: string): boolean {
  return git(root, ["check-ignore", "-q", "--", rel]).status === 0;
}

// Paths among `rels` that `git status` reports as changed or untracked.
export function visiblePaths(root: string, rels: string[]): string[] {
  if (rels.length === 0) return [];
  const result = git(root, ["status", "--porcelain", "--untracked-files=all", "--", ...rels]);
  return result.stdout === "" ? [] : result.stdout.split("\n").map((line) => line.slice(3));
}

const EXCLUDE_START = "# >>> dotagents (managed, do not edit)";
const EXCLUDE_END = "# <<< dotagents";

function excludeFile(root: string): string {
  // --git-path resolves correctly for worktrees, where .git is a file.
  return path.resolve(root, git(root, ["rev-parse", "--git-path", "info/exclude"]).stdout);
}

export function writeExcludes(root: string, rels: string[]): void {
  const file = excludeFile(root);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const stripped = stripExcludeBlock(current);
  const block = [EXCLUDE_START, ...rels.map((rel) => `/${rel}`), EXCLUDE_END].join("\n") + "\n";
  const next = rels.length === 0 ? stripped : `${stripped.replace(/\n*$/, stripped ? "\n" : "")}${block}`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, next);
}

export function removeExcludes(root: string): void {
  writeExcludes(root, []);
}

function stripExcludeBlock(text: string): string {
  const start = text.indexOf(EXCLUDE_START);
  if (start === -1) return text;
  const end = text.indexOf(EXCLUDE_END, start);
  const tail = end === -1 ? "" : text.slice(end + EXCLUDE_END.length).replace(/^\n/, "");
  return text.slice(0, start) + tail;
}
