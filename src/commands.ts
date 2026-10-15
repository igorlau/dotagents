import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { apply, type ApplyResult } from "./apply.ts";
import { readBlock } from "./blocks.ts";
import { loadCatalog, loadScaffold } from "./catalog.ts";
import { repoRoot } from "./git.ts";
import {
  fromStored,
  globalManifestPath,
  hash,
  projectManifestPath,
  readManifest,
  toStored,
  writeManifest,
  type Manifest,
} from "./manifest.ts";
import { codexHome, configDir, packageRoot } from "./paths.ts";
import { planInstall, planScaffold, type Agent, type Mode } from "./targets.ts";

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

export const DEFAULT_SOURCE = "@igorlau/dotagents@latest";

// Release tags carry a real version. Builds from a branch carry X.Y.0-dev,
// so the commit tells them apart.
export function version(): string {
  const base: string = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")).version;
  const buildInfo = path.join(packageRoot, "dist", "build-info.json");
  if (!base.endsWith("-dev") || !fs.existsSync(buildInfo)) return base;
  const { commit } = JSON.parse(fs.readFileSync(buildInfo, "utf8"));
  return commit ? `${base}+${commit}` : base;
}

function log(message = ""): void {
  console.log(message);
}

function globalScope(): Scope {
  return { mode: "global", root: undefined, manifestPath: globalManifestPath() };
}

function projectScope(cwd: string): Scope {
  const root = repoRoot(cwd);
  if (!root) throw new Error("Not inside a Git repository. Run this command from a repository, or use `dotagents install` for a global install.");
  return { mode: "project", root, manifestPath: projectManifestPath(root) };
}

function existingProjectScope(cwd: string): Scope | undefined {
  const root = repoRoot(cwd);
  if (!root) return undefined;
  const manifest = readManifest(projectManifestPath(root));
  return manifest ? { mode: manifest.mode, root, manifestPath: projectManifestPath(root) } : undefined;
}

// Install, update, and uninstall all reduce to: apply a plan, then record it.
function run(scope: Scope, agents: Agent[], options: Options, uninstall = false): boolean {
  const previous = readManifest(scope.manifestPath);
  const catalog = loadCatalog();
  const ops = uninstall ? [] : planInstall(catalog, scope.mode, agents, scope.root);
  const result = apply(ops, fromStored(previous?.entries ?? [], scope.root), options);
  report(result, options.dryRun);
  if (options.dryRun) return result.problems.length === 0;

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
  return result.problems.length === 0;
}

function report(result: ApplyResult, dryRun: boolean): void {
  const prefix = dryRun ? "would " : "";
  for (const change of result.changes) log(`  ${prefix}${change}`);
  for (const problem of result.problems) log(`  ! ${problem}`);
  if (result.changes.length === 0 && result.problems.length === 0) log("  Already up to date.");
}

export function install(options: Options): boolean {
  log(`Installing dotagents ${version()} globally for ${options.agents.join(", ")}:`);
  return run(globalScope(), options.agents, options);
}

export function init(cwd: string, options: Options): boolean {
  const scope = projectScope(cwd);
  log(`Installing dotagents ${version()} into ${scope.root}:`);
  const ok = run(scope, options.agents, options);
  if (!options.dryRun) log("Commit the new files so that collaborators get them too.");
  return ok;
}

// Scaffold files belong to the repository once written, so no manifest tracks
// them, and update and uninstall leave them alone.
export function scaffold(cwd: string, options: Options): boolean {
  const root = projectScope(cwd).root!;
  log(`Scaffolding agent instructions into ${root}:`);
  const result = apply(planScaffold(loadScaffold(), options.agents, root), [], options);
  report(result, options.dryRun);
  if (!options.dryRun) log("Review the files, keep AGENTS.md current as the project takes shape, and commit them.");
  return result.problems.length === 0;
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
  return scope.root ? `the project install in ${scope.root}` : "the global install";
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
