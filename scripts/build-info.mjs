// Records the commit that a build came from, so that installs from a branch
// can report it. Plain JavaScript: it runs in `prepare`, before any build.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

let commit;
try {
  commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
} catch {
  // Not a Git checkout, such as an install from a release tarball.
}
fs.mkdirSync("dist", { recursive: true });
fs.writeFileSync("dist/build-info.json", JSON.stringify({ commit }) + "\n");
