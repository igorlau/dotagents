import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function homeDir(): string {
  return os.homedir();
}

export function claudeHome(): string {
  return process.env.CLAUDE_CONFIG_DIR ?? path.join(homeDir(), ".claude");
}

export function codexHome(): string {
  return process.env.CODEX_HOME ?? path.join(homeDir(), ".codex");
}

export function copilotHome(): string {
  return process.env.COPILOT_HOME ?? path.join(homeDir(), ".copilot");
}

export function agentsHome(): string {
  return path.join(homeDir(), ".agents");
}

export function configDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  return xdg ? path.join(xdg, "dotagents") : path.join(homeDir(), ".config", "dotagents");
}

// Works from both src/ (tests, scripts) and dist/ (installed package).
export const packageRoot = fileURLToPath(new URL("..", import.meta.url));
export const contentRoot = path.join(packageRoot, "content");
