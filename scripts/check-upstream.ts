// Shows what changed upstream since each vendored skill was copied.
// Usage: npm run check-upstream [-- --diff]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { contentRoot } from "../src/paths.ts";

interface Upstream {
  repository: string;
  path: string;
  commit: string;
}

const showDiff = process.argv.includes("--diff");
const clones = new Map<string, string>();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dotagents-upstream-"));

function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed:\n${result.stderr}`);
  return result.stdout;
}

function clone(repository: string): string {
  let dir = clones.get(repository);
  if (!dir) {
    dir = path.join(tmp, String(clones.size));
    git(tmp, ["clone", "--quiet", "--filter=blob:none", repository, dir]);
    clones.set(repository, dir);
  }
  return dir;
}

try {
  const skillsDir = path.join(contentRoot, "skills");
  for (const name of fs.readdirSync(skillsDir).sort()) {
    const file = path.join(skillsDir, name, "UPSTREAM.json");
    if (!fs.existsSync(file)) continue;
    const upstream = JSON.parse(fs.readFileSync(file, "utf8")) as Upstream;
    const dir = clone(upstream.repository);
    const head = git(dir, ["rev-parse", "HEAD"]).trim();
    const stat = git(dir, ["diff", "--stat", upstream.commit, head, "--", upstream.path]).trim();
    if (stat === "") {
      console.log(`${name}: up to date with ${upstream.repository}`);
      continue;
    }
    console.log(`${name}: upstream changed since ${upstream.commit.slice(0, 7)} (now ${head.slice(0, 7)})\n${stat}`);
    if (showDiff) console.log(git(dir, ["diff", upstream.commit, head, "--", upstream.path]));
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
