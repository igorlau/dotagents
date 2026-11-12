// Checks the structure of plugin/: skill frontmatter, relative links, the
// rules and skill size budgets, upstream metadata, scaffold templates, and the plugin
// and marketplace manifests. Exits 1 on any problem.
import fs from "node:fs";
import path from "node:path";
import { packageRoot, pluginRoot } from "../src/paths.ts";
import { parseFrontmatter } from "../src/frontmatter.ts";

// Rules load into every conversation, so they cost tokens on every turn.
// Raise this only with a reason. About 4 characters make one token.
const RULES_CHAR_BUDGET = 7500;
// A SKILL.md loads in full when its skill runs; conditional content belongs in references/.
const SKILL_CHAR_BUDGET = 8000;
// Personal skills win name clashes in Claude Code, so the prefix keeps
// dotagents skills from hiding a repository's own skills.
const SKILL_PREFIX = "dot-";
// Limits from the Agent Skills specification.
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 64;
const DESCRIPTION_MAX = 1024;
const UPSTREAM_FIELDS = ["repository", "path", "commit", "license", "modified"];

const problems: string[] = [];
const fail = (file: string, message: string) => problems.push(`${path.relative(pluginRoot, file)}: ${message}`);

const rulesDir = path.join(pluginRoot, "rules");
let ruleChars = 0;
for (const name of fs.readdirSync(rulesDir)) {
  const file = path.join(rulesDir, name);
  if (name.endsWith(".md")) {
    ruleChars += fs.readFileSync(file, "utf8").length;
    checkLinks(file);
  } else if (name.endsWith(".upstream.json")) {
    checkUpstream(file);
    if (!fs.existsSync(file.replace(/\.upstream\.json$/, ".md"))) fail(file, "no matching rules file");
  } else {
    fail(file, "unexpected file; rules are .md files with optional .upstream.json files");
  }
}
if (ruleChars > RULES_CHAR_BUDGET) fail(rulesDir, `${ruleChars} characters exceeds the budget of ${RULES_CHAR_BUDGET}`);

const skillsDir = path.join(pluginRoot, "skills");
for (const name of fs.readdirSync(skillsDir)) {
  const dir = path.join(skillsDir, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const skillFile = path.join(dir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    fail(dir, "missing SKILL.md");
    continue;
  }

  const skillText = fs.readFileSync(skillFile, "utf8");
  if (skillText.length > SKILL_CHAR_BUDGET) fail(skillFile, `${skillText.length} characters exceeds the budget of ${SKILL_CHAR_BUDGET}; move conditional content to references/`);

  let frontmatter;
  try {
    frontmatter = parseFrontmatter(skillText);
  } catch (error) {
    fail(skillFile, (error as Error).message);
    continue;
  }
  if (!frontmatter) {
    fail(skillFile, "missing frontmatter");
    continue;
  }
  const { data } = frontmatter;
  if (data.name !== name) fail(skillFile, `name "${data.name}" must match the directory name "${name}"`);
  if (!NAME_PATTERN.test(name) || name.length > NAME_MAX) fail(skillFile, `name must be lowercase words joined by hyphens, at most ${NAME_MAX} characters`);
  if (!name.startsWith(SKILL_PREFIX)) fail(skillFile, `name must start with "${SKILL_PREFIX}"`);
  if (!data.description) fail(skillFile, "missing description");
  else if (data.description.length > DESCRIPTION_MAX) fail(skillFile, `description exceeds ${DESCRIPTION_MAX} characters`);

  for (const file of markdownFiles(dir)) checkLinks(file);

  const upstreamFile = path.join(dir, "UPSTREAM.json");
  if (fs.existsSync(upstreamFile)) checkUpstream(upstreamFile);
}

// Scaffold templates need the .tmpl suffix; see loadScaffold in src/catalog.ts.
const scaffoldDir = path.join(pluginRoot, "scaffold");
for (const file of allFiles(scaffoldDir)) {
  if (!file.endsWith(".tmpl")) fail(file, "scaffold templates must end in .tmpl");
  else if (file.endsWith(".json.tmpl")) {
    try {
      JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      fail(file, `invalid JSON: ${(error as Error).message}`);
    }
  }
}

checkManifests();

/** Checks that the marketplace lists this plugin by name, and that the plugin has no fixed version. */
function checkManifests(): void {
  const pluginFile = path.join(pluginRoot, ".claude-plugin", "plugin.json");
  const marketplaceFile = path.join(packageRoot, ".claude-plugin", "marketplace.json");
  const plugin = readJson(pluginFile);
  const marketplace = readJson(marketplaceFile);
  if (!plugin || !marketplace) return;

  const entry = marketplace.plugins?.find((candidate: { source?: string }) => path.resolve(packageRoot, candidate.source ?? "") === path.resolve(pluginRoot));
  if (!entry) fail(marketplaceFile, "no plugin entry whose source is plugin/");
  else if (entry.name !== plugin.name) fail(marketplaceFile, `plugin name "${entry.name}" must match plugin.json name "${plugin.name}"`);
  // Claude Code skips updates while the version stays the same; without one, it versions by commit.
  if ("version" in plugin) fail(pluginFile, "remove \"version\", so Claude Code updates the plugin on every commit");
}

function readJson(file: string) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(file, (error as Error).message);
    return undefined;
  }
}

function allFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = path.join(dir, entry.name);
    return entry.isDirectory() ? allFiles(abs) : [abs];
  });
}

function checkUpstream(file: string): void {
  const upstream = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const field of UPSTREAM_FIELDS) if (!(field in upstream)) fail(file, `missing "${field}"`);
  if (upstream.commit && !/^[0-9a-f]{40}$/.test(upstream.commit)) fail(file, "commit must be a full SHA");
  if (upstream.modified && !upstream.notes) fail(file, "modified content must describe its changes in notes");
}

function markdownFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(abs);
    return entry.name.endsWith(".md") ? [abs] : [];
  });
}

function checkLinks(file: string): void {
  const text = fs.readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (target === "" || /^[a-z]+:/i.test(target)) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file), target))) fail(file, `broken link to ${match[1]}`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exitCode = 1;
} else {
  console.log("Content OK.");
}
