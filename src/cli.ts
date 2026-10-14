#!/usr/bin/env node
import { parseArgs } from "node:util";
import { doctor, init, install, list, saveSource, selfUpdate, uninstall, update, version } from "./commands.ts";
import { parseAgents } from "./targets.ts";

const HELP = `dotagents: install curated agent skills and rules

Usage:
  dotagents install                 Install globally (default for all projects)
  dotagents init [--local-only]     Install into the current repository
  dotagents update [--global|--project]
  dotagents uninstall [--global|--project]
  dotagents doctor                  Check installs for problems
  dotagents list                    List the skills in the catalog
  dotagents self-update             Run \`update\` with the latest release

Options:
  --agents <list>   Comma-separated: claude,codex,copilot (default: all)
  --local-only      With init: keep every file out of Git
  --dry-run         Print changes without writing them
  --force           Overwrite files that were modified or not written by dotagents
  --source <spec>   With install: where self-update fetches dotagents from
  -v, --version     Print the version
  -h, --help        Print this help
`;

function main(argv: string[]): number {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      agents: { type: "string" },
      "local-only": { type: "boolean", default: false },
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
  const [command] = positionals;
  if (values.help || !command) {
    console.log(HELP);
    return command || values.help ? 0 : 1;
  }

  const options = { agents: parseAgents(values.agents), dryRun: values["dry-run"], force: values.force };
  const which = values.global ? "global" : values.project ? "project" : undefined;
  const cwd = process.cwd();

  switch (command) {
    case "install":
      if (values.source && !options.dryRun) saveSource(values.source);
      return install(options) ? 0 : 1;
    case "init":
      return init(cwd, values["local-only"], options) ? 0 : 1;
    case "update":
      return update(cwd, which, options) ? 0 : 1;
    case "uninstall":
      return uninstall(cwd, which, options) ? 0 : 1;
    case "doctor":
      return doctor(cwd) ? 0 : 1;
    case "list":
      list();
      return 0;
    case "self-update":
      return selfUpdate(argv.slice(1)) ? 0 : 1;
    default:
      console.error(`Unknown command "${command}".\n\n${HELP}`);
      return 1;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`dotagents: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
