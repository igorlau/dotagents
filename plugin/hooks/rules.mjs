// Hook for the start of a session. The plugin updates on every commit, but the
// rules reach Claude Code only when the user runs `dotagents update`. This
// hook warns the user when the installed rules differ from the plugin's rules.
// shortcut: checks only Claude Code's rules file, add the Codex and Copilot blocks when their plugins update apart from the CLI.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rulesDir = fileURLToPath(new URL("../rules", import.meta.url));
const claudeHome = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), ".claude");
const installedFile = path.join(claudeHome, "rules", "dotagents.md");

let message;
try {
  const installed = fs.readFileSync(installedFile, "utf8");
  // Same heading shift as loadRules() in the CLI's src/catalog.ts.
  const stale = fs
    .readdirSync(rulesDir)
    .filter((name) => name.endsWith(".md"))
    .some((name) => !installed.includes(fs.readFileSync(path.join(rulesDir, name), "utf8").trim().replace(/^#/gm, "##")));
  if (stale) message = "The installed dotagents rules differ from the rules of the dotagents plugin. Run `dotagents update` with a release that has the same rules, and add `--force` if you changed the rules file.";
} catch {
  // Without Claude Code's directory, another coding agent runs the plugin, and its rules are in another file.
  if (fs.existsSync(claudeHome)) message = "The dotagents plugin needs the dotagents rules. Run `npx @igorlau/dotagents install`.";
}
console.log(JSON.stringify(message ? { systemMessage: message } : {}));
