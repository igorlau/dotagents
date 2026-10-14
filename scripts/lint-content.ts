// Checks the structure of content/: skill frontmatter, relative links, the
// rules line budget, and UPSTREAM.json files. Exits 1 on any problem.
import fs from "node:fs";
import path from "node:path";
import { contentRoot } from "../src/paths.ts";
import { parseFrontmatter } from "../src/frontmatter.ts";

// Rules load into every conversation. Raise this only with a reason.
const RULES_LINE_BUDGET = 25;
// Limits from the Agent Skills specification.
const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME_MAX = 64;
const DESCRIPTION_MAX = 1024;
const UPSTREAM_FIELDS = ["repository", "path", "commit", "license", "modified"];

const problems: string[] = [];
const fail = (file: string, message: string) => problems.push(`${path.relative(contentRoot, file)}: ${message}`);

const rulesFile = path.join(contentRoot, "rules", "core.md");
const ruleLines = fs.readFileSync(rulesFile, "utf8").trim().split("\n").length;
if (ruleLines > RULES_LINE_BUDGET) fail(rulesFile, `${ruleLines} lines exceeds the budget of ${RULES_LINE_BUDGET}`);

const skillsDir = path.join(contentRoot, "skills");
for (const name of fs.readdirSync(skillsDir)) {
  const dir = path.join(skillsDir, name);
  if (!fs.statSync(dir).isDirectory()) continue;
  const skillFile = path.join(dir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    fail(dir, "missing SKILL.md");
    continue;
  }

  let frontmatter;
  try {
    frontmatter = parseFrontmatter(fs.readFileSync(skillFile, "utf8"));
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
  if (!data.description) fail(skillFile, "missing description");
  else if (data.description.length > DESCRIPTION_MAX) fail(skillFile, `description exceeds ${DESCRIPTION_MAX} characters`);

  for (const file of markdownFiles(dir)) checkLinks(file);

  const upstreamFile = path.join(dir, "UPSTREAM.json");
  if (fs.existsSync(upstreamFile)) {
    const upstream = JSON.parse(fs.readFileSync(upstreamFile, "utf8"));
    for (const field of UPSTREAM_FIELDS) if (!(field in upstream)) fail(upstreamFile, `missing "${field}"`);
    if (upstream.commit && !/^[0-9a-f]{40}$/.test(upstream.commit)) fail(upstreamFile, "commit must be a full SHA");
    if (upstream.modified && !upstream.notes) fail(upstreamFile, "modified skills must describe their changes in notes");
  }
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
