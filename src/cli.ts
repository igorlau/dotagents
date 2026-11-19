#!/usr/bin/env node
import { parseArgs } from "node:util";
import { doctor, init, install, list, saveSource, scaffold, selfUpdate, setCheckHook, uninstall, update, version } from "./commands.ts";
import { parseAgents } from "./targets.ts";
import { claudePlugin, clackPrompts, installWizard, opensWizard, scaffoldWizard, uninstallWizard } from "./wizard.ts";

const HELP = `dotagents: install curated agent skills and rules

Usage:
  dotagents                         In a terminal, open the install wizard
  dotagents install                 Install globally (default for all projects)
  dotagents init                    Install into the current repository (commit the files)
  dotagents scaffold                Create starter AGENTS.md, CLAUDE.md, and settings in the current repository
  dotagents update [--global|--project]
  dotagents uninstall [--global|--project]
  dotagents doctor                  Check installs for problems
  dotagents list                    List the skills in the catalog
  dotagents self-update             Run \`update\` with the latest release
  dotagents check enable|disable    Let the plugin's check hook run in the current repository, or stop it

Options:
  --agents <list>   Comma-separated: claude,copilot (default: all)
  --dry-run         Print changes without writing them
  --force           Overwrite files that were modified or not written by dotagents
  --source <spec>   With install: where self-update fetches dotagents from
  -v, --version     Print the version
  -h, --help        Print this help

In a terminal, install, scaffold, and uninstall open a wizard. --dry-run and
--force skip the wizard, and so does --source for install.
`;

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      agents: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      force: { type: "boolean", default: false },
      global: { type: "boolean", default: false },
      project: { type: "boolean", default: false },
      source: { type: "string" },
      version: { type: "boolean", short: "v", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.version) {
    console.log(version());
    return 0;
  }
  if (values.help) {
    console.log(HELP);
    return 0;
  }
  const [command, subcommand] = positionals;
  const interactive = process.stdin.isTTY === true && process.stdout.isTTY === true;
  if (opensWizard({ command, interactive, values })) {
    const agents = values.agents === undefined ? undefined : parseAgents(values.agents);
    return (await installWizard(clackPrompts, claudePlugin, { agents, cwd: process.cwd() })) ? 0 : 1;
  }
  if (!command) {
    console.log(HELP);
    return 1;
  }

  const options = { agents: parseAgents(values.agents), dryRun: values["dry-run"], force: values.force };
  const which = values.global ? "global" : values.project ? "project" : undefined;
  const cwd = process.cwd();

  switch (command) {
    case "install":
      if (values.source && !options.dryRun) saveSource(values.source);
      return install(options) ? 0 : 1;
    case "init":
      return init(cwd, options) ? 0 : 1;
    case "scaffold":
      if (interactive && !options.dryRun && !options.force) {
        const agents = values.agents === undefined ? undefined : options.agents;
        return (await scaffoldWizard(clackPrompts, { agents, cwd })) ? 0 : 1;
      }
      return scaffold(cwd, options) ? 0 : 1;
    case "update":
      return update(cwd, which, options) ? 0 : 1;
    case "uninstall":
      if (interactive && !options.dryRun && !options.force) return (await uninstallWizard(clackPrompts, { cwd, which })) ? 0 : 1;
      return uninstall(cwd, which, options) ? 0 : 1;
    case "doctor":
      return doctor(cwd) ? 0 : 1;
    case "list":
      list();
      return 0;
    case "check":
      if (subcommand !== "enable" && subcommand !== "disable") throw new Error("Usage: dotagents check enable|disable");
      setCheckHook(cwd, subcommand === "enable", options.dryRun);
      return 0;
    case "self-update":
      return selfUpdate(argv.slice(1)) ? 0 : 1;
    default:
      console.error(`Unknown command "${command}".\n\n${HELP}`);
      return 1;
  }
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(`dotagents: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
