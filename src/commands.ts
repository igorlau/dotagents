import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { apply, type ApplyOptions, type ApplyResult } from "./apply.ts";
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
import { claudeHome, configDir, packageRoot } from "./paths.ts";
import { planInstall, planScaffold, projectClaudeRulesFile, type Agent, type Mode, type Op } from "./targets.ts";

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

export const UP_TO_DATE = "Already up to date.";

export const NOTHING_TO_UNINSTALL = "Nothing to uninstall.";

export const PLUGIN_HINT =
  "Claude Code gets the dotagents skills from the plugin. To install it, run `/plugin marketplace add igorlau/dotagents` and `/plugin install dotagents@dotagents` in Claude Code.";

// Release tags carry a real version. Builds from a branch carry X.Y.0-dev,
// so the commit tells them apart.
export function version(): string {
  const base: string = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")).version;
  const buildInfo = path.join(packageRoot, "dist", "build-info.json");
  if (!base.endsWith("-dev") || !fs.existsSync(buildInfo)) return base;
  const { commit } = JSON.parse(fs.readFileSync(buildInfo, "utf8"));
  return commit ? `${base}+${commit}` : base;
}

const RELEASE = /^\d+\.\d+\.\d+$/;

/** Reports whether release `cli` is older than release `installed`. A build from a branch is never older. */
export function isOlderRelease(cli: string, installed: string): boolean {
  if (!RELEASE.test(cli) || !RELEASE.test(installed)) return false;
  return cli.localeCompare(installed, "en", { numeric: true }) < 0;
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

const PREVIEW: ApplyOptions = { dryRun: true, force: false };

function plan(scope: Scope, agents: Agent[], options: ApplyOptions, uninstall: boolean, pending: Op[] = []): { result: ApplyResult; skills: string[] } {
  const previous = readManifest(scope.manifestPath);
  const catalog = loadCatalog();
  const ops = uninstall ? [] : planInstall(catalog, scope.mode, agents, scope.root, pending);
  const result = apply(ops, fromStored(previous?.entries ?? [], scope.root), options);
  const skills = uninstall ? (previous?.skills ?? []) : catalog.skills.map((skill) => skill.name);
  return { result, skills };
}

/** Computes the changes of a global install without writing files or logging. */
export function previewInstall(agents: Agent[]): ApplyResult {
  return plan(globalScope(), agents, PREVIEW, false).result;
}

/** Computes the changes of a project install into the repository that contains `cwd`, after `scaffold` creates `scaffoldFiles`. Throws outside a repository. */
export function previewInit(cwd: string, agents: Agent[], { scaffoldFiles = [] }: { scaffoldFiles?: string[] } = {}): ApplyResult {
  const scope = projectScope(cwd);
  return plan(scope, agents, PREVIEW, false, scaffoldOps(scope.root!, agents, scaffoldFiles)).result;
}

/** Returns the root of the repository that contains `cwd`. Throws outside a repository. */
export function projectRoot(cwd: string): string {
  return projectScope(cwd).root!;
}

/** Lists the scaffold files for `agents` in the repository that contains `cwd`, and whether each one exists. Throws outside a repository. */
export function listScaffoldFiles(cwd: string, agents: Agent[]): { exists: boolean; path: string }[] {
  return planScaffold(loadScaffold(), agents, projectRoot(cwd)).map((op) => ({ exists: fs.existsSync(op.path), path: op.path }));
}

/** Computes the changes of `scaffold` for `files` in the repository that contains `cwd`. Throws outside a repository. */
export function previewScaffold(cwd: string, agents: Agent[], files: string[]): ApplyResult {
  return apply(scaffoldOps(projectRoot(cwd), agents, files), [], PREVIEW);
}

function scaffoldOps(root: string, agents: Agent[], files: string[]): Op[] {
  return planScaffold(loadScaffold(), agents, root).filter((op) => files.includes(op.path));
}

/** Computes the changes of an uninstall for each existing install that `which` selects. */
export function previewUninstall(cwd: string, which?: Mode): { mode: Mode; result: ApplyResult; root?: string }[] {
  return selectScopes(cwd, which).map((scope) => ({
    mode: scope.mode,
    result: plan(scope, readManifest(scope.manifestPath)!.agents, PREVIEW, true).result,
    root: scope.root,
  }));
}

// Install, update, and uninstall all reduce to: apply a plan, then record it.
function run(scope: Scope, agents: Agent[], options: Options, uninstall = false): boolean {
  const { result, skills } = plan(scope, agents, options, uninstall);
  report(result, options.dryRun);
  if (options.dryRun) return result.problems.length === 0;
  const claudeRulesFile = scope.root === undefined ? undefined : projectClaudeRulesFile(scope.root);
  if (!uninstall && result.changes.some((change) => change.action === "remove" && change.path === claudeRulesFile)) {
    log("Claude Code now reads the rules from AGENTS.md.");
  }

  if (result.entries.length === 0) {
    fs.rmSync(scope.manifestPath, { force: true });
  } else {
    writeManifest(scope.manifestPath, {
      schema: 1,
      version: version(),
      mode: scope.mode,
      agents,
      skills,
      entries: toStored(result.entries, scope.root),
      updatedAt: new Date().toISOString(),
    });
  }
  return result.problems.length === 0;
}

function report(result: ApplyResult, dryRun: boolean): void {
  const prefix = dryRun ? "would " : "";
  for (const change of result.changes) log(`  ${prefix}${change.action} ${change.path}`);
  for (const problem of result.problems) log(`  ! ${problem}`);
  if (result.changes.length === 0 && result.problems.length === 0) log(`  ${UP_TO_DATE}`);
}

export function install(options: Options, pluginHint = true): boolean {
  log(`Installing dotagents ${version()} globally for ${options.agents.join(", ")}:`);
  const ok = run(globalScope(), options.agents, options);
  if (pluginHint) logPluginHint(options.agents);
  return ok;
}

function logPluginHint(agents: Agent[]): void {
  if (agents.includes("claude") && !dotagentsPluginInstalled()) log(PLUGIN_HINT);
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
export function scaffold(cwd: string, options: Options, { files }: { files?: string[] } = {}): boolean {
  const root = projectRoot(cwd);
  log(`Scaffolding agent instructions into ${root}:`);
  const planned = files ?? listScaffoldFiles(cwd, options.agents).map((file) => file.path);
  const result = apply(scaffoldOps(root, options.agents, planned), [], options);
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
    if (isOlderRelease(version(), manifest.version) && !options.force) {
      log(`Skipping ${describe(scope)}: it has dotagents ${manifest.version}, and this CLI is older (${version()}). Run \`dotagents self-update\`, or pass --force to downgrade.`);
      ok = false;
      continue;
    }
    if (manifest.agents.length === 0 && manifest.removedAgents.length > 0) {
      log(`${manifest.removedAgents.join(", ")} is no longer supported. Removing ${describe(scope)}.`);
    } else {
      log(`Updating ${describe(scope)} to dotagents ${version()}:`);
    }
    ok = run(scope, manifest.agents, { ...options, agents: manifest.agents }) && ok;
    if (scope.mode === "global") logPluginHint(manifest.agents);
  }
  return ok;
}

export function uninstall(cwd: string, which: "global" | "project" | undefined, options: Omit<Options, "agents">): boolean {
  const scopes = selectScopes(cwd, which);
  if (scopes.length === 0) {
    log(NOTHING_TO_UNINSTALL);
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
    const entries = fromStored(manifest.entries, scope.root);
    if (version() === manifest.version) {
      const installed = new Set(entries.map((entry) => entry.path));
      for (const op of planInstall(loadCatalog(), scope.mode, manifest.agents, scope.root)) {
        if (!installed.has(op.path)) issues.push(`${op.path}: not installed. Run \`dotagents update\`.`);
      }
    }
    for (const entry of entries) {
      if (!fs.existsSync(entry.path)) {
        issues.push(`${entry.path}: missing. Run \`dotagents update\`.`);
        continue;
      }
      const content = fs.readFileSync(entry.path, "utf8");
      const owned = entry.kind === "file" ? content : readBlock(content);
      if (owned === undefined) issues.push(`${entry.path}: dotagents block missing. Run \`dotagents update\`.`);
      else if (hash(entry.kind === "file" ? owned : owned.trim()) !== entry.hash) issues.push(`${entry.path}: modified since dotagents wrote it.`);
    }
    if (scope.mode === "global" && manifest.agents.includes("claude")) {
      issues.push(...(dotagentsPluginInstalled() ? duplicateClaudeSkills() : [PLUGIN_HINT]));
    }
    if (isOlderRelease(version(), manifest.version)) {
      log(`  This CLI (${version()}) is older than the install (${manifest.version}). Run \`dotagents self-update\`.`);
    } else if (version() !== manifest.version) {
      log(`  Installed version ${manifest.version} differs from this CLI (${version()}). Run \`dotagents update\`.`);
    }
  }

  const checkRepos = readConfig().checkRepos ?? [];
  log(checkRepos.length > 0 ? `  The check hook runs in: ${checkRepos.join(", ")}` : "  The check hook runs in no repository. Run `dotagents check enable` in one.");
  for (const issue of issues) log(`  ! ${issue}`);
  if (issues.length === 0) log("  No problems found.");
  return issues.length === 0;
}

/** Lists `dot-*` skills in Claude Code's skills directory when the dotagents plugin also provides them. */
function duplicateClaudeSkills(): string[] {
  const skillsDir = path.join(claudeHome(), "skills");
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir)
    .filter((name) => name.startsWith("dot-"))
    .map((name) => `${path.join(skillsDir, name)}: Claude Code also loads this skill from the dotagents plugin. Delete the directory.`);
}

/** Reports whether Claude Code lists the dotagents plugin in `installed_plugins.json`. */
export function dotagentsPluginInstalled(): boolean {
  try {
    const installed = JSON.parse(fs.readFileSync(path.join(claudeHome(), "plugins", "installed_plugins.json"), "utf8"));
    return Object.keys(installed.plugins ?? {}).some((id) => id.startsWith("dotagents@"));
  } catch {
    return false;
  }
}

export function list(): void {
  for (const skill of loadCatalog().skills) log(`${skill.name}\n  ${skill.description}`);
}

/** The user's settings. The plugin's `hooks/check.mjs` reads `checkRepos` from the same file. */
interface Config {
  checkRepos?: string[];
  source?: string;
}

function configFile(): string {
  return path.join(configDir(), "config.json");
}

function readConfig(): Config {
  const file = configFile();
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${file} isn't valid JSON: ${(error as Error).message}. Fix or delete it.`);
  }
}

function writeConfig(changes: Config): void {
  fs.mkdirSync(configDir(), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify({ ...readConfig(), ...changes }, null, 2) + "\n");
}

export function readSource(): string {
  return readConfig().source ?? DEFAULT_SOURCE;
}

export function saveSource(source: string): void {
  writeConfig({ source });
}

/** Reports whether the plugin's `check` hook runs in the repository that contains `cwd`. */
export function checkHookEnabled(cwd: string): boolean {
  const root = repoRoot(cwd);
  return root !== undefined && (readConfig().checkRepos ?? []).includes(fs.realpathSync(root));
}

/** Enables or disables the plugin's `check` hook for the repository that contains `cwd`. Throws outside a repository. */
export function setCheckHook(cwd: string, enabled: boolean, dryRun: boolean): void {
  const root = repoRoot(cwd);
  if (!root) throw new Error("Not inside a Git repository. Run this command from the repository to change.");
  const repo = fs.realpathSync(root);
  const others = (readConfig().checkRepos ?? []).filter((candidate) => candidate !== repo);
  const state = enabled ? "enabled" : "disabled";
  if (dryRun) {
    log(`The check hook would be ${state} in ${repo}.`);
    return;
  }
  writeConfig({ checkRepos: enabled ? [...others, repo].sort() : others });
  log(`The check hook is ${state} in ${repo}.`);
}

export function selfUpdate(args: string[]): boolean {
  const source = readSource();
  if (!isInside(packageRoot, npmGlobalRoot())) {
    log(`Running the latest dotagents from ${source}:`);
    return runInherited(packageManagerCommand("npx", ["--yes", "--prefer-online", source, "update", ...args]));
  }
  log(`Installing the latest dotagents from ${source} with npm:`);
  if (!runInherited(packageManagerCommand("npm", ["install", "--global", "--prefer-online", source]))) return false;
  return runInherited({ args: [path.join(packageRoot, "dist", "cli.js"), "update", ...args], command: process.execPath, shell: false });
}

function runInherited({ args, command, shell }: PackageManagerCommand): boolean {
  return spawnSync(command, args, { shell, stdio: "inherit" }).status === 0;
}

function npmGlobalRoot(): string | undefined {
  const { args, command, shell } = packageManagerCommand("npm", ["root", "--global"]);
  const result = spawnSync(command, args, { encoding: "utf8", shell });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

/** Reports whether `dir` is inside `parent`. */
export function isInside(dir: string, parent: string | undefined): boolean {
  if (parent === undefined) return false;
  const relative = path.relative(parent, dir);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

interface PackageManagerCommand {
  args: string[];
  command: string;
  shell: boolean;
}

/**
 * Builds the command that starts `npm` or `npx`. On Windows, both are `.cmd` files, which Node starts only through a shell,
 * so the arguments go into one quoted command line. `cmd.exe` still reads `"` and `%` inside quotes, so those throw.
 */
export function packageManagerCommand(name: "npm" | "npx", args: string[], platform: NodeJS.Platform = process.platform): PackageManagerCommand {
  if (platform !== "win32") return { args, command: name, shell: false };
  const unsafe = args.find((arg) => /["%]/.test(arg));
  if (unsafe !== undefined) throw new Error(`Cannot pass ${unsafe} to ${name} on Windows. Remove the " and % characters.`);
  return { args: [], command: [name, ...args.map((arg) => `"${arg}"`)].join(" "), shell: true };
}
