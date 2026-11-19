import fs from "node:fs";
import path from "node:path";
import type { Catalog, ScaffoldFile } from "./catalog.ts";
import { agentsHome, claudeHome, copilotHome } from "./paths.ts";

export const AGENTS = ["claude", "copilot"] as const;
export type Agent = (typeof AGENTS)[number];

// global: user-level directories. project: committed to the repository.
export type Mode = "global" | "project";

export type Op =
  | { kind: "file"; path: string; content: string; executable?: boolean }
  | { kind: "block"; path: string; content: string };

const HEADER = "<!-- Managed by dotagents. Run `dotagents update` instead of editing this file. -->";
const RULES_FILE = "dotagents.md";

// Paths where each agent reads skills and rules. See SPEC.md, "Agent targets".
interface Layout {
  skillDirs: Record<Agent, string>;
  claudeRules: string;
  claudeRulesInAgentsMd: boolean;
  copilotRules: string;
}

function layout(mode: Mode, root: string, pending: Op[]): Layout {
  if (mode === "global") {
    return {
      skillDirs: {
        claude: path.join(claudeHome(), "skills"),
        copilot: path.join(agentsHome(), "skills"),
      },
      claudeRules: path.join(claudeHome(), "rules", RULES_FILE),
      claudeRulesInAgentsMd: false,
      // Copilot loads this file in every session; files in ~/.copilot/instructions/
      // load only when their applyTo pattern matches a file being edited.
      copilotRules: path.join(copilotHome(), "copilot-instructions.md"),
    };
  }
  // Copilot reads AGENTS.md too, so Claude Code and Copilot share one block.
  const agentsMd = path.join(root, "AGENTS.md");
  const claudeRulesInAgentsMd = claudeReadsAgentsMd(root, pending);
  return {
    skillDirs: {
      claude: path.join(root, ".claude", "skills"),
      copilot: path.join(root, ".agents", "skills"),
    },
    claudeRules: claudeRulesInAgentsMd ? agentsMd : projectClaudeRulesFile(root),
    claudeRulesInAgentsMd,
    copilotRules: agentsMd,
  };
}

/** Plans an install. `pending` holds the ops of another step that runs first, such as scaffold, so the plan sees the files that it writes. */
export function planInstall(catalog: Catalog, mode: Mode, agents: Agent[], root = "", pending: Op[] = []): Op[] {
  const target = layout(mode, root, pending);
  const ops = new Map<string, Op>();
  const add = (op: Op) => ops.set(op.path, op);

  for (const agent of agents) {
    // Claude Code gets its skills globally from the dotagents plugin. See SPEC.md, decision 19.
    if (mode === "global" && agent === "claude") continue;
    for (const skill of catalog.skills) {
      for (const file of skill.files) {
        add({
          kind: "file",
          path: path.join(target.skillDirs[agent], skill.name, ...file.rel.split("/")),
          content: file.content,
          executable: file.executable,
        });
      }
    }
  }

  const rules = catalog.rules.trim();
  if (agents.includes("claude")) {
    add(
      target.claudeRulesInAgentsMd
        ? { kind: "block", path: target.claudeRules, content: rules }
        : { kind: "file", path: target.claudeRules, content: `${HEADER}\n\n${rules}\n` },
    );
  }
  if (agents.includes("copilot")) add({ kind: "block", path: target.copilotRules, content: rules });

  return [...ops.values()];
}

/** The rules file for Claude Code in a project install, when Claude Code does not read AGENTS.md. */
export function projectClaudeRulesFile(root: string): string {
  return path.join(root, ".claude", "rules", RULES_FILE);
}

// Claude Code reads AGENTS.md when the project has no CLAUDE.md or CLAUDE.local.md: https://code.claude.com/docs/en/memory#agents-md
function claudeReadsAgentsMd(root: string, pending: Op[]): boolean {
  const claudeMdPath = path.join(root, "CLAUDE.md");
  const claudeMd = pending.find((op) => op.path === claudeMdPath)?.content ?? readIfExists(claudeMdPath);
  if (claudeMd !== undefined) return importsAgentsMd(claudeMd);
  return !["CLAUDE.local.md", path.join(".claude", "CLAUDE.md")].some((rel) => fs.existsSync(path.join(root, rel)));
}

/** Reports whether the repository at `root` has a CLAUDE.md that does not import AGENTS.md. */
export function claudeMdSkipsAgentsMd(root: string): boolean {
  const claudeMd = readIfExists(path.join(root, "CLAUDE.md"));
  return claudeMd !== undefined && !importsAgentsMd(claudeMd);
}

function importsAgentsMd(claudeMd: string | undefined): boolean {
  return claudeMd !== undefined && /^@(\.\/)?AGENTS\.md\s*$/m.test(claudeMd);
}

function readIfExists(file: string): string | undefined {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : undefined;
}

// AGENTS.md serves every agent; CLAUDE.md and .claude/ serve only Claude Code.
export function planScaffold(files: ScaffoldFile[], agents: Agent[], root: string): Op[] {
  const claudeOnly = (rel: string) => rel === "CLAUDE.md" || rel.startsWith(".claude/");
  return files
    .filter((file) => agents.includes("claude") || !claudeOnly(file.rel))
    .map((file) => ({ kind: "file", path: path.join(root, ...file.rel.split("/")), content: file.content }));
}

export function parseAgents(value: string | undefined): Agent[] {
  if (!value) return [...AGENTS];
  const agents = value.split(",").map((agent) => agent.trim());
  for (const agent of agents) {
    if (!(AGENTS as readonly string[]).includes(agent)) {
      throw new Error(`Unknown agent "${agent}". Use one or more of: ${AGENTS.join(", ")}.`);
    }
  }
  return agents as Agent[];
}
