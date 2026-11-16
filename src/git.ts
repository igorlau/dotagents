import { spawnSync } from "node:child_process";

export function repoRoot(cwd: string): string | undefined {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" });
  if (result.error && (result.error as NodeJS.ErrnoException).code !== "ENOENT") throw result.error;
  return result.status === 0 ? result.stdout.trim() : undefined;
}
