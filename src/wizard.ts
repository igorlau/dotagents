import * as clack from "@clack/prompts";
import { install } from "./commands.ts";
import { AGENTS, type Agent } from "./targets.ts";

export const CANCEL = Symbol("cancel");
export type Cancel = typeof CANCEL;

/** The questions a wizard asks. Tests pass canned answers, and `CANCEL` stands for Ctrl+C. */
export interface Prompts {
  confirm(options: { message: string }): Promise<boolean | Cancel>;
  multiselect<Value>(options: { initialValues: Value[]; message: string; options: clack.Option<Value>[]; required: boolean }): Promise<Value[] | Cancel>;
  select<Value>(options: { initialValue?: Value; message: string; options: clack.Option<Value>[] }): Promise<Value | Cancel>;
}

export const clackPrompts: Prompts = {
  async confirm(options) {
    const answer = await clack.confirm(options);
    return clack.isCancel(answer) ? CANCEL : answer;
  },
  async multiselect(options) {
    const answer = await clack.multiselect(options);
    return clack.isCancel(answer) ? CANCEL : answer;
  },
  async select(options) {
    const answer = await clack.select(options);
    return clack.isCancel(answer) ? CANCEL : answer;
  },
};

interface WizardFlags {
  "dry-run": boolean;
  force: boolean;
  global: boolean;
  project: boolean;
  source?: string;
}

/** Whether the CLI opens the install wizard: in a terminal, for no command or `install`, with no flag other than `--agents`. */
export function opensWizard({ command, interactive, values }: { command?: string; interactive: boolean; values: WizardFlags }): boolean {
  if (!interactive) return false;
  if (command !== undefined && command !== "install") return false;
  return !values["dry-run"] && !values.force && !values.global && !values.project && values.source === undefined;
}

const AGENT_LABELS: Record<Agent, string> = { claude: "Claude Code", codex: "Codex", copilot: "GitHub Copilot" };

/** Asks for the agents, shows the changes, and installs globally after the user confirms. */
export async function installWizard(prompts: Prompts, options: { agents?: Agent[] }): Promise<boolean> {
  const agents =
    options.agents ??
    (await prompts.multiselect({
      initialValues: [...AGENTS],
      message: "Which agents do you use?",
      options: AGENTS.map((agent) => ({ label: AGENT_LABELS[agent], value: agent })),
      required: true,
    }));
  if (agents === CANCEL) return cancelled();

  install({ agents, dryRun: true, force: false });
  const proceed = await prompts.confirm({ message: "Proceed with installation?" });
  if (proceed !== true) return cancelled();

  return install({ agents, dryRun: false, force: false });
}

function cancelled(): false {
  console.log("Cancelled. Nothing changed.");
  return false;
}
