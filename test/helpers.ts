import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

export interface Sandbox {
  home: string;
  run(args: string[], cwd?: string): { status: number; output: string };
  repo(files?: Record<string, string>): string;
  cleanup(): void;
}

// A throwaway home directory, so tests never touch the real agent config.
export function sandbox(): Sandbox {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "dotagents-test-"));
  const home = path.join(base, "home");
  fs.mkdirSync(home);
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: home,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  let repos = 0;

  return {
    home,
    run(args, cwd = home) {
      const result = spawnSync(process.execPath, [CLI, ...args], { cwd, env, encoding: "utf8" });
      return { status: result.status ?? 1, output: result.stdout + result.stderr };
    },
    repo(files = {}) {
      const dir = path.join(base, `repo-${repos++}`);
      fs.mkdirSync(dir);
      git(dir, ["init", "-q", "-b", "main"]);
      for (const [rel, content] of Object.entries(files)) write(path.join(dir, rel), content);
      git(dir, ["add", "-A"]);
      git(dir, ["-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-q", "--allow-empty", "-m", "initial"]);
      return dir;
    },
    cleanup() {
      fs.rmSync(base, { recursive: true, force: true });
    },
  };
}

export function git(cwd: string, args: string[]): string {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trimEnd();
}

export function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function read(file: string): string {
  return fs.readFileSync(file, "utf8");
}

export function exists(file: string): boolean {
  return fs.existsSync(file);
}

// Lists every file under `dir`, relative to it, excluding .git.
export function tree(dir: string): string[] {
  const walk = (current: string): string[] =>
    fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
      if (entry.name === ".git") return [];
      const abs = path.join(current, entry.name);
      return entry.isDirectory() ? walk(abs) : [path.relative(dir, abs)];
    });
  return walk(dir).sort();
}
