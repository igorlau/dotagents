// Records the commit that a build came from, so that installs from a branch
// can report it. A build of the release tag records none. Plain JavaScript:
// it runs in `prepare`, before any build.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const { version } = JSON.parse(fs.readFileSync("package.json", "utf8"));

let commit;
try {
  const isReleaseTag = git("tag", "--points-at", "HEAD").split("\n").includes(`v${version}`);
  commit = isReleaseTag ? undefined : git("rev-parse", "--short", "HEAD");
} catch {
  // Not a Git checkout, such as an install from a release tarball.
}
fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/build-info.json", JSON.stringify({ commit }) + "\n");
