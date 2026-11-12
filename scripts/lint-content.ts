// Checks the structure of plugin/: skill and agent frontmatter, relative links and
// anchors, the rules and skill size budgets, upstream metadata, scaffold templates, and
// the plugin and marketplace manifests. Also checks that the top-level docs and docs/
// name only real skills and agents, with the right counts. Exits 1 on any problem.
import fs from "node:fs";
import path from "node:path";
import { packageRoot, pluginRoot } from "../src/paths.ts";
import { parseFrontmatter } from "../src/frontmatter.ts";
import { headingAnchors, withoutFences } from "./markdown.ts";

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
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

const problems: string[] = [];
const fail = (file: string, message: string, line?: number) => problems.push(`${path.relative(packageRoot, file)}${line ? `:${line}` : ""}: ${message}`);

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
// Claude Code can't preload a skill that sets disable-model-invocation into an agent.
const preloadableSkills = new Set<string>();
const skillNames = new Set<string>();
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

  skillNames.add(name);
  const data = readFrontmatter(skillFile, skillText);
  if (!data) continue;
  if (data.name !== name) fail(skillFile, `name "${data.name}" must match the directory name "${name}"`);
  if (!NAME_PATTERN.test(name) || name.length > NAME_MAX) fail(skillFile, `name must be lowercase words joined by hyphens, at most ${NAME_MAX} characters`);
  if (!name.startsWith(SKILL_PREFIX)) fail(skillFile, `name must start with "${SKILL_PREFIX}"`);
  if (!data.description) fail(skillFile, "missing description");
  else if (data.description.length > DESCRIPTION_MAX) fail(skillFile, `description exceeds ${DESCRIPTION_MAX} characters`);
  if (data["disable-model-invocation"] !== "true") preloadableSkills.add(name);

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

const agentsDir = path.join(pluginRoot, "agents");
const pluginName = checkManifests();
if (pluginName) checkAgents(pluginName);

const agentNames = new Set(fs.readdirSync(agentsDir).filter((name) => name.endsWith(".md")).map((name) => path.basename(name, ".md")));
const docsDir = path.join(packageRoot, "docs");
const readmeFile = path.join(packageRoot, "README.md");
const docFiles = [readmeFile, ...["SPEC.md", "CONTRIBUTING.md"].map((name) => path.join(packageRoot, name))];
if (fs.existsSync(docsDir)) docFiles.push(...markdownFiles(docsDir));
for (const file of docFiles) checkDoc(file);

/**
 * Checks a doc's links, that every dot-* name in code or a link target is a real skill or agent,
 * and that a count before "skills" or "agents" matches the catalog. The README must name every one.
 */
function checkDoc(file: string): void {
  checkLinks(file);
  const text = withoutFences(fs.readFileSync(file, "utf8"));
  const catalog = new Set([...skillNames, ...agentNames]);
  const named = new Set<string>();
  // Inline code spans and link targets.
  for (const span of text.matchAll(/`[^`\n]+`|\]\([^)\s]+\)/g)) {
    for (const name of span[0].matchAll(/(?<![\w-])dot-[a-z0-9]+(?:-[a-z0-9]+)*/g)) {
      named.add(name[0]);
      if (!catalog.has(name[0])) fail(file, `"${name[0]}" is not a skill or an agent`, lineOf(text, span.index));
    }
  }
  if (file === readmeFile) {
    for (const name of catalog) if (!named.has(name)) fail(file, `does not list "${name}"`);
  }
  const counts: Record<string, number> = { skills: skillNames.size, agents: agentNames.size };
  for (const match of text.matchAll(new RegExp(`\\b(\\d+|${NUMBER_WORDS.join("|")})\\s+(skills|agents)\\b`, "gi"))) {
    const stated = /^\d+$/.test(match[1]) ? Number(match[1]) : NUMBER_WORDS.indexOf(match[1].toLowerCase());
    const actual = counts[match[2].toLowerCase()];
    if (stated !== actual) fail(file, `"${match[0].replace(/\s+/g, " ")}" must be ${actual} ${match[2]}`, lineOf(text, match.index));
  }
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

/**
 * Checks agent frontmatter. Each preloaded skill must carry the plugin's namespace: a bare
 * name loads a same-named skill from ~/.claude/skills/ first, such as a stale copy.
 */
function checkAgents(pluginName: string): void {
  for (const name of fs.readdirSync(agentsDir)) {
    const file = path.join(agentsDir, name);
    if (!name.endsWith(".md")) {
      fail(file, "unexpected file; agents are .md files");
      continue;
    }
    const data = readFrontmatter(file, fs.readFileSync(file, "utf8"));
    if (!data) continue;
    if (data.name !== path.basename(name, ".md")) fail(file, `name "${data.name}" must match the file name`);
    if (!data.description) fail(file, "missing description");
    for (const entry of (data.skills ?? "").split(",").map((skill) => skill.trim()).filter(Boolean)) {
      const prefix = `${pluginName}:`;
      if (!entry.startsWith(prefix)) fail(file, `skill "${entry}" must start with "${prefix}"`);
      else if (!preloadableSkills.has(entry.slice(prefix.length))) fail(file, `skill "${entry}" isn't a plugin skill that Claude can invoke`);
    }
    checkLinks(file);
  }
}

/**
 * Checks that the marketplace lists this plugin by name, and that the plugin has no fixed version.
 * Returns the plugin name, or undefined when plugin.json can't be read.
 */
function checkManifests(): string | undefined {
  const pluginFile = path.join(pluginRoot, ".claude-plugin", "plugin.json");
  const marketplaceFile = path.join(packageRoot, ".claude-plugin", "marketplace.json");
  const plugin = readJson(pluginFile);
  const marketplace = readJson(marketplaceFile);
  if (!plugin || !marketplace) return plugin?.name;

  const entry = marketplace.plugins?.find((candidate: { source?: string }) => path.resolve(packageRoot, candidate.source ?? "") === path.resolve(pluginRoot));
  if (!entry) fail(marketplaceFile, "no plugin entry whose source is plugin/");
  else if (entry.name !== plugin.name) fail(marketplaceFile, `plugin name "${entry.name}" must match plugin.json name "${plugin.name}"`);
  // Claude Code skips updates while the version stays the same; without one, it versions by commit.
  if ("version" in plugin) fail(pluginFile, "remove \"version\", so Claude Code updates the plugin on every commit");
  return plugin.name;
}

/** Returns the frontmatter fields of a file, or reports why it has none and returns undefined. */
function readFrontmatter(file: string, text: string): Record<string, string> | undefined {
  try {
    const frontmatter = parseFrontmatter(text);
    if (!frontmatter) fail(file, "missing frontmatter");
    return frontmatter?.data;
  } catch (error) {
    fail(file, (error as Error).message);
    return undefined;
  }
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

/** Checks that relative links resolve, and that each #anchor matches a heading in the target markdown file. */
function checkLinks(file: string): void {
  const text = withoutFences(fs.readFileSync(file, "utf8"));
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const [target, anchor] = match[1].split("#");
    if (/^[a-z]+:/i.test(target)) continue;
    const line = lineOf(text, match.index);
    const targetFile = target === "" ? file : path.resolve(path.dirname(file), target);
    let heading = anchor;
    try {
      heading = decodeURIComponent(anchor);
    } catch {
      // A malformed escape stays as written, and the anchor check reports it.
    }
    if (!fs.existsSync(targetFile)) fail(file, `broken link to ${match[1]}`, line);
    else if (anchor && targetFile.endsWith(".md") && !headingAnchors(fs.readFileSync(targetFile, "utf8")).has(heading)) {
      fail(file, `no heading in ${target || "this file"} matches #${anchor}`, line);
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  process.exitCode = 1;
} else {
  console.log("Content OK.");
}
