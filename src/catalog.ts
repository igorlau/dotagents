import fs from "node:fs";
import path from "node:path";
import { contentRoot } from "./paths.ts";
import { parseFrontmatter } from "./frontmatter.ts";

export interface SkillFile {
  rel: string;
  content: string;
  executable: boolean;
}

export interface Skill {
  name: string;
  description: string;
  files: SkillFile[];
}

export interface Catalog {
  rules: string;
  skills: Skill[];
}

// Files that describe a skill's origin but aren't part of the skill itself.
const META_FILES = new Set(["UPSTREAM.json"]);

export function loadCatalog(root: string = contentRoot): Catalog {
  const rules = fs.readFileSync(path.join(root, "rules", "core.md"), "utf8");
  const skillsDir = path.join(root, "skills");
  const skills = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadSkill(path.join(skillsDir, entry.name)))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { rules, skills };
}

function loadSkill(dir: string): Skill {
  const name = path.basename(dir);
  const files = listFiles(dir)
    .filter((rel) => !META_FILES.has(rel))
    .map((rel) => {
      const abs = path.join(dir, rel);
      return {
        rel,
        content: fs.readFileSync(abs, "utf8"),
        executable: (fs.statSync(abs).mode & 0o111) !== 0,
      };
    });
  const skillMd = files.find((file) => file.rel === "SKILL.md");
  if (!skillMd) throw new Error(`Skill ${name} has no SKILL.md`);
  const description = parseFrontmatter(skillMd.content)?.data.description ?? "";
  return { name, description, files };
}

function listFiles(dir: string, prefix = ""): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(path.join(dir, entry.name), rel) : [rel];
  });
}
