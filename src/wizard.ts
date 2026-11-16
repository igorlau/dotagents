import path from "node:path";
import * as clack from "@clack/prompts";
import type { ApplyResult, ChangeAction } from "./apply.ts";
import { init, install, previewInit, previewInstall, UP_TO_DATE } from "./commands.ts";
import { repoRoot } from "./git.ts";
import { homeDir } from "./paths.ts";
import { AGENTS, type Agent, type Mode } from "./targets.ts";

export const CANCEL = Symbol("cancel");
export type Cancel = typeof CANCEL;

/** The questions a wizard asks and the notes it shows. Tests pass canned answers, and `CANCEL` stands for Ctrl+C. */
export interface Prompts {
  confirm(options: { message: string }): Promise<boolean | Cancel>;
  multiselect<Value>(options: { initialValues: Value[]; message: string; options: clack.Option<Value>[]; required: boolean }): Promise<Value[] | Cancel>;
  note(message: string, title: string): void;
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
  note(message, title) {
    clack.note(message, title);
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

/** Asks for the agents and the scope, shows the changes, and installs after the user confirms. */
export async function installWizard(prompts: Prompts, options: { agents?: Agent[]; cwd: string }): Promise<boolean> {
  const agents =
    options.agents ??
    (await prompts.multiselect({
      initialValues: [...AGENTS],
      message: "Which agents do you use?",
      options: AGENTS.map((agent) => ({ label: AGENT_LABELS[agent], value: agent })),
      required: true,
    }));
  if (agents === CANCEL) return cancelled();

  const scope =
    repoRoot(options.cwd) === undefined
      ? "global"
      : await prompts.select<Mode>({
          initialValue: "global",
          message: "Where do you want to install dotagents?",
          options: [
            { label: "Global (Recommended)", value: "global" },
            { label: "This repository, for collaborators", value: "project" },
          ],
        });
  if (scope === CANCEL) return cancelled();

  const preview = scope === "global" ? previewInstall(agents) : previewInit(options.cwd, agents);
  prompts.note(summaryLines(preview).join("\n"), "Installation summary");
  const proceed = await prompts.confirm({ message: "Proceed with installation?" });
  if (proceed !== true) return cancelled();

  const installOptions = { agents, dryRun: false, force: false };
  return scope === "global" ? install(installOptions) : init(options.cwd, installOptions);
}

function cancelled(): false {
  console.log("Cancelled. Nothing changed.");
  return false;
}

const SKILL_FILE = /^(.*[\\/]skills)[\\/][^\\/]+[\\/]/;

/** Counts the changes of each action in each target directory, then lists each problem. */
export function summaryLines(result: ApplyResult): string[] {
  if (result.changes.length === 0 && result.problems.length === 0) return [UP_TO_DATE];
  const groups = new Map<string, Map<ChangeAction, number>>();
  for (const change of result.changes) {
    const group = withTilde(SKILL_FILE.exec(change.path)?.[1] ?? change.path);
    const counts = groups.get(group) ?? new Map<ChangeAction, number>();
    counts.set(change.action, (counts.get(change.action) ?? 0) + 1);
    groups.set(group, counts);
  }
  const lines = [...groups].map(([group, counts]) => {
    const actions = [...counts].map(([action, count]) => `${action} ${count} ${count === 1 ? "file" : "files"}`);
    return `${group}: ${actions.join(", ")}`;
  });
  return [...lines, ...result.problems];
}

function withTilde(file: string): string {
  const home = homeDir();
  return file.startsWith(home + path.sep) ? `~${file.slice(home.length)}` : file;
}
