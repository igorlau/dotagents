import path from "node:path";
import type { Catalog } from "./catalog.ts";
import { agentsHome, claudeHome, codexHome, copilotHome } from "./paths.ts";

export const AGENTS = ["claude", "codex", "copilot"] as const;
export type Agent = (typeof AGENTS)[number];

// global: user-level directories. project: committed to the repository.
// local: written to the repository but excluded from Git.
export type Mode = "global" | "project" | "local";

export type Op =
  | { kind: "file"; path: string; content: string; executable?: boolean }
  | { kind: "block"; path: string; content: string };

export interface Plan {
  ops: Op[];
  notes: string[];
}

const HEADER = "<!-- Managed by dotagents. Run `dotagents update` instead of editing this file. -->";
const RULES_FILE = "dotagents.md";
const COPILOT_RULES_FILE = "dotagents.instructions.md";

// Paths where each agent reads skills and rules. See SPEC.md, "Agent targets".
interface Layout {
  skillDirs: Record<Agent, string>;
  claudeRules: string;
  codexRules?: string;
  copilotRules: { kind: "file" | "block"; path: string };
}

function layout(mode: Mode, root: string): Layout {
  if (mode === "global") {
    return {
      skillDirs: {
        claude: path.join(claudeHome(), "skills"),
        codex: path.join(agentsHome(), "skills"),
        copilot: path.join(agentsHome(), "skills"),
      },
      claudeRules: path.join(claudeHome(), "rules", RULES_FILE),
      codexRules: path.join(codexHome(), "AGENTS.md"),
      copilotRules: { kind: "file", path: path.join(copilotHome(), "instructions", COPILOT_RULES_FILE) },
    };
  }
  const shared = {
    skillDirs: {
      claude: path.join(root, ".claude", "skills"),
      codex: path.join(root, ".agents", "skills"),
      copilot: path.join(root, ".agents", "skills"),
    },
    claudeRules: path.join(root, ".claude", "rules", RULES_FILE),
  };
  if (mode === "project") {
    // Copilot reads AGENTS.md too, so both agents share one block.
    const agentsMd = path.join(root, "AGENTS.md");
    return { ...shared, codexRules: agentsMd, copilotRules: { kind: "block", path: agentsMd } };
  }
  // Codex reads one instruction file per directory, so local mode can't add
  // a sibling file for it without editing a tracked AGENTS.md.
  return {
    ...shared,
    codexRules: undefined,
    copilotRules: { kind: "file", path: path.join(root, ".github", "instructions", COPILOT_RULES_FILE) },
  };
}

export function planInstall(catalog: Catalog, mode: Mode, agents: Agent[], root = ""): Plan {
  const target = layout(mode, root);
  const ops = new Map<string, Op>();
  const notes: string[] = [];
  const add = (op: Op) => ops.set(op.path, op);

  for (const agent of agents) {
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
    add({ kind: "file", path: target.claudeRules, content: `${HEADER}\n\n${rules}\n` });
  }
  if (agents.includes("codex")) {
    if (target.codexRules) add({ kind: "block", path: target.codexRules, content: rules });
    else notes.push("Codex rules aren't installed in local-only mode. Run `dotagents install` to get them globally.");
  }
  if (agents.includes("copilot")) {
    const { kind, path: rulesPath } = target.copilotRules;
    if (kind === "block") add({ kind, path: rulesPath, content: rules });
    else add({ kind, path: rulesPath, content: `---\napplyTo: "**"\n---\n\n${HEADER}\n\n${rules}\n` });
  }

  return { ops: [...ops.values()], notes };
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
