import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { apply, type ApplyResult } from "./apply.ts";
import { readBlock } from "./blocks.ts";
import { loadCatalog } from "./catalog.ts";
import { isTracked, removeExcludes, repoRoot, visiblePaths, writeExcludes } from "./git.ts";
import {
  fromStored,
  globalManifestPath,
  hash,
  PROJECT_MANIFEST,
  projectManifestPath,
  readManifest,
  toStored,
  writeManifest,
  type Manifest,
} from "./manifest.ts";
import { codexHome, configDir, packageRoot } from "./paths.ts";
import { planInstall, type Agent, type Mode } from "./targets.ts";

export interface Options {
  agents: Agent[];
  dryRun: boolean;
  force: boolean;
}

// Where an install lives: the global one, or one inside a repository.
interface Scope {
  mode: Mode;
  root: string | undefined;
  manifestPath: string;
}

export const DEFAULT_SOURCE = "github:igorlau/dotagents";

export function version(): string {
  return JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")).version;
}

function log(message = ""): void {
  console.log(message);
}

function globalScope(): Scope {
  return { mode: "global", root: undefined, manifestPath: globalManifestPath() };
}

function projectScope(mode: Mode, cwd: string): Scope {
  const root = repoRoot(cwd);
  if (!root) throw new Error("Not inside a Git repository. Run this command from a repository, or use `dotagents install` for a global install.");
  return { mode, root, manifestPath: projectManifestPath(root) };
}

function existingProjectScope(cwd: string): Scope | undefined {
  const root = repoRoot(cwd);
  if (!root) return undefined;
  const manifest = readManifest(projectManifestPath(root));
  return manifest ? { mode: manifest.mode, root, manifestPath: projectManifestPath(root) } : undefined;
}

function rel(scope: Scope, abs: string): string {
  return path.relative(scope.root ?? "", abs).split(path.sep).join("/");
}

// Install, update, and uninstall all reduce to: apply a plan, then record it.
function run(scope: Scope, agents: Agent[], options: Options, uninstall = false): boolean {
  const previous = readManifest(scope.manifestPath);
  if (previous && previous.mode !== scope.mode) {
    throw new Error(`This repository already has a ${previous.mode} install. Run \`dotagents uninstall --project\` first.`);
  }
  const catalog = loadCatalog();
  const plan = uninstall ? { ops: [], notes: [] } : planInstall(catalog, scope.mode, agents, scope.root);
  const guard =
    scope.mode === "local" && scope.root
      ? (abs: string) => (isTracked(scope.root!, rel(scope, abs)) ? "tracked by Git, and local-only mode never writes tracked files" : undefined)
      : undefined;

  const result = apply(plan.ops, fromStored(previous?.entries ?? [], scope.root), { ...options, guard });
  report(result, plan.notes, options.dryRun);
  if (options.dryRun) return result.problems.length === 0;

  if (scope.mode === "local" && scope.root) {
    if (result.entries.length === 0) removeExcludes(scope.root);
    else writeExcludes(scope.root, [PROJECT_MANIFEST, ...result.entries.map((entry) => rel(scope, entry.path))]);
  }
  if (result.entries.length === 0) {
    fs.rmSync(scope.manifestPath, { force: true });
  } else {
    writeManifest(scope.manifestPath, {
      schema: 1,
      version: version(),
      mode: scope.mode,
      agents,
      skills: uninstall ? (previous?.skills ?? []) : catalog.skills.map((skill) => skill.name),
      entries: toStored(result.entries, scope.root),
      updatedAt: new Date().toISOString(),
    });
  }

  if (scope.mode === "local" && scope.root) {
    const visible = visiblePaths(scope.root, [PROJECT_MANIFEST, ...result.entries.map((entry) => rel(scope, entry.path))]);
    for (const file of visible) result.problems.push(`${file}: visible to Git after a local-only install`);
    if (visible.length > 0) log("Some managed files are visible to Git. Check them before you commit.");
  }
  return result.problems.length === 0;
}

function report(result: ApplyResult, notes: string[], dryRun: boolean): void {
  const prefix = dryRun ? "would " : "";
  for (const change of result.changes) log(`  ${prefix}${change}`);
  for (const problem of result.problems) log(`  ! ${problem}`);
  for (const note of notes) log(`  note: ${note}`);
  if (result.changes.length === 0 && result.problems.length === 0) log("  Already up to date.");
}

export function install(options: Options): boolean {
  log(`Installing dotagents ${version()} globally for ${options.agents.join(", ")}:`);
  return run(globalScope(), options.agents, options);
}

export function init(cwd: string, localOnly: boolean, options: Options): boolean {
  const scope = projectScope(localOnly ? "local" : "project", cwd);
  log(`Installing dotagents ${version()} into ${scope.root} (${localOnly ? "local-only" : "project"} mode):`);
  const ok = run(scope, options.agents, options);
  if (!options.dryRun && !localOnly) log("Commit the new files so that collaborators get them too.");
  return ok;
}

function selectScopes(cwd: string, which: "global" | "project" | undefined): Scope[] {
  const scopes: Scope[] = [];
  if (which !== "project" && readManifest(globalManifestPath())) scopes.push(globalScope());
  if (which !== "global") {
    const project = existingProjectScope(cwd);
    if (project) scopes.push(project);
  }
  return scopes;
}

export function update(cwd: string, which: "global" | "project" | undefined, options: Omit<Options, "agents">): boolean {
  const scopes = selectScopes(cwd, which);
  if (scopes.length === 0) {
    log("Nothing to update. Run `dotagents install` or `dotagents init` first.");
    return true;
  }
  let ok = true;
  for (const scope of scopes) {
    const manifest = readManifest(scope.manifestPath)!;
    log(`Updating ${describe(scope)} to dotagents ${version()}:`);
    ok = run(scope, manifest.agents, { ...options, agents: manifest.agents }) && ok;
  }
  return ok;
}

export function uninstall(cwd: string, which: "global" | "project" | undefined, options: Omit<Options, "agents">): boolean {
  const scopes = selectScopes(cwd, which);
  if (scopes.length === 0) {
    log("Nothing to uninstall.");
    return true;
  }
  let ok = true;
  for (const scope of scopes) {
    const manifest = readManifest(scope.manifestPath)!;
    log(`Uninstalling ${describe(scope)}:`);
    ok = run(scope, manifest.agents, { ...options, agents: manifest.agents }, true) && ok;
  }
  return ok;
}

function describe(scope: Scope): string {
  return scope.root ? `the ${scope.mode === "local" ? "local-only" : "project"} install in ${scope.root}` : "the global install";
}

export function doctor(cwd: string): boolean {
  const scopes = selectScopes(cwd, undefined);
  const issues: string[] = [];
  if (scopes.length === 0) issues.push("No dotagents install found. Run `dotagents install`.");

  for (const scope of scopes) {
    const manifest = readManifest(scope.manifestPath) as Manifest;
    log(`Checking ${describe(scope)} (dotagents ${manifest.version}, agents: ${manifest.agents.join(", ")})`);
    for (const entry of fromStored(manifest.entries, scope.root)) {
      if (!fs.existsSync(entry.path)) {
        issues.push(`${entry.path}: missing. Run \`dotagents update\`.`);
        continue;
      }
      const content = fs.readFileSync(entry.path, "utf8");
      const owned = entry.kind === "file" ? content : readBlock(content);
      if (owned === undefined) issues.push(`${entry.path}: dotagents block missing. Run \`dotagents update\`.`);
      else if (hash(entry.kind === "file" ? owned : owned.trim()) !== entry.hash) issues.push(`${entry.path}: modified since dotagents wrote it.`);
    }
    if (scope.mode === "local" && scope.root) {
      const rels = [PROJECT_MANIFEST, ...manifest.entries.map((entry) => entry.path)];
      for (const file of visiblePaths(scope.root, rels)) issues.push(`${file}: visible to Git in a local-only install.`);
      if (!readManifest(globalManifestPath()) && manifest.agents.includes("codex")) {
        issues.push("Codex has no dotagents rules: local-only mode relies on the global install. Run `dotagents install`.");
      }
    }
    if (scope.mode === "global" && manifest.agents.includes("codex") && fs.existsSync(path.join(codexHome(), "AGENTS.override.md"))) {
      issues.push(`${path.join(codexHome(), "AGENTS.override.md")} exists, so Codex ignores the rules in AGENTS.md.`);
    }
    if (version() !== manifest.version) log(`  Installed version ${manifest.version} differs from this CLI (${version()}). Run \`dotagents update\`.`);
  }

  for (const issue of issues) log(`  ! ${issue}`);
  if (issues.length === 0) log("  No problems found.");
  return issues.length === 0;
}

export function list(): void {
  for (const skill of loadCatalog().skills) log(`${skill.name}\n  ${skill.description}`);
}

function configFile(): string {
  return path.join(configDir(), "config.json");
}

export function readSource(): string {
  const file = configFile();
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")).source ?? DEFAULT_SOURCE) : DEFAULT_SOURCE;
}

export function saveSource(source: string): void {
  fs.mkdirSync(configDir(), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify({ source }, null, 2) + "\n");
}

export function selfUpdate(args: string[]): boolean {
  const source = readSource();
  log(`Running the latest dotagents from ${source}:`);
  const result = spawnSync("npx", ["--yes", "--prefer-online", source, "update", ...args], { stdio: "inherit" });
  return result.status === 0;
}
