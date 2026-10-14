import fs from "node:fs";
import path from "node:path";
import { readBlock, removeBlock, upsertBlock } from "./blocks.ts";
import { hash, type Entry } from "./manifest.ts";
import type { Op } from "./targets.ts";

export interface ApplyOptions {
  dryRun: boolean;
  force: boolean;
  // Returns a reason to refuse writing a path, such as "tracked by Git".
  guard?: (absPath: string) => string | undefined;
}

export interface ApplyResult {
  entries: Entry[];
  changes: string[];
  problems: string[];
}

// Directories that agents expect to exist; pruning empty parents stops here.
const PRUNE_STOP = new Set(["skills", ".claude", ".agents", ".github", ".codex", ".copilot"]);

// Writes `ops` and removes whatever `previous` owned that `ops` no longer
// includes. Files that changed since dotagents wrote them, and files that
// dotagents never wrote, are left alone unless `force` is set.
export function apply(ops: Op[], previous: Entry[], options: ApplyOptions): ApplyResult {
  const owned = new Map(previous.map((entry) => [entry.path, entry]));
  const result: ApplyResult = { entries: [], changes: [], problems: [] };

  // Refused paths are never written or removed, and stop being tracked.
  const refused = new Set<string>();
  for (const op of ops) {
    const refusal = options.guard?.(op.path);
    if (refusal) {
      result.problems.push(`${op.path}: ${refusal}`);
      refused.add(op.path);
      continue;
    }
    const entry = op.kind === "file" ? applyFile(op, owned.get(op.path), options, result) : applyBlock(op, owned.get(op.path), options, result);
    if (entry) result.entries.push(entry);
  }

  const kept = new Set(result.entries.map((entry) => entry.path));
  for (const entry of previous) {
    if (kept.has(entry.path) || refused.has(entry.path)) continue;
    const refusal = options.guard?.(entry.path);
    if (refusal) {
      result.problems.push(`${entry.path}: ${refusal}, not removed`);
      continue;
    }
    if (!removeEntry(entry, options, result)) result.entries.push(entry);
  }

  return result;
}

function read(file: string): string | undefined {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
}

function write(file: string, content: string, options: ApplyOptions, executable = false): void {
  if (options.dryRun) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  if (executable) fs.chmodSync(file, 0o755);
}

function applyFile(op: Extract<Op, { kind: "file" }>, owned: Entry | undefined, options: ApplyOptions, result: ApplyResult): Entry | undefined {
  const entry: Entry = { path: op.path, kind: "file", hash: hash(op.content) };
  const current = read(op.path);
  if (current === undefined) {
    write(op.path, op.content, options, op.executable);
    result.changes.push(`create ${op.path}`);
    return entry;
  }
  if (current === op.content) return entry;
  if (!options.force) {
    if (!owned) {
      result.problems.push(`${op.path}: exists and wasn't written by dotagents (use --force to overwrite)`);
      return undefined;
    }
    if (hash(current) !== owned.hash) {
      result.problems.push(`${op.path}: modified locally, skipped (use --force to overwrite)`);
      return owned;
    }
  }
  write(op.path, op.content, options, op.executable);
  result.changes.push(`update ${op.path}`);
  return entry;
}

function applyBlock(op: Extract<Op, { kind: "block" }>, owned: Entry | undefined, options: ApplyOptions, result: ApplyResult): Entry | undefined {
  const body = op.content.trim();
  const entry: Entry = { path: op.path, kind: "block", hash: hash(body) };
  const current = read(op.path);
  const block = current === undefined ? undefined : readBlock(current);
  entry.created = owned?.created ?? current === undefined;
  if (block === body) return entry;
  if (owned && block !== undefined && hash(block) !== owned.hash && !options.force) {
    result.problems.push(`${op.path}: dotagents block modified locally, skipped (use --force to overwrite)`);
    return owned;
  }
  write(op.path, upsertBlock(current, body), options);
  result.changes.push(`${block === undefined ? "add block to" : "update block in"} ${op.path}`);
  return entry;
}

// Returns true when the entry no longer needs tracking.
function removeEntry(entry: Entry, options: ApplyOptions, result: ApplyResult): boolean {
  const current = read(entry.path);
  if (current === undefined) return true;

  if (entry.kind === "file") {
    if (hash(current) !== entry.hash && !options.force) {
      result.problems.push(`${entry.path}: modified locally, not removed (use --force to remove)`);
      return false;
    }
    if (!options.dryRun) {
      fs.rmSync(entry.path);
      prune(path.dirname(entry.path));
    }
    result.changes.push(`remove ${entry.path}`);
    return true;
  }

  const block = readBlock(current);
  if (block === undefined) return true;
  if (hash(block) !== entry.hash && !options.force) {
    result.problems.push(`${entry.path}: dotagents block modified locally, not removed (use --force to remove)`);
    return false;
  }
  const rest = removeBlock(current);
  if (rest === "" && entry.created) {
    if (!options.dryRun) fs.rmSync(entry.path);
    result.changes.push(`remove ${entry.path}`);
  } else {
    write(entry.path, rest, options);
    result.changes.push(`remove block from ${entry.path}`);
  }
  return true;
}

function prune(dir: string): void {
  while (!PRUNE_STOP.has(path.basename(dir)) && fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}
