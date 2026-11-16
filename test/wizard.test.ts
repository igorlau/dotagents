import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { ApplyResult, Change } from "../src/apply.ts";
import { PLUGIN_HINT } from "../src/commands.ts";
import { CANCEL, installWizard, opensWizard, scaffoldWizard, summaryLines, type Cancel, type PluginInstall, type PluginInstaller, type Prompts } from "../src/wizard.ts";
import type { Mode } from "../src/targets.ts";
import { exists, read, sandbox, tree, write, type Sandbox } from "./helpers.ts";

const HOME_VARIABLES = ["HOME", "CLAUDE_CONFIG_DIR", "CODEX_HOME", "COPILOT_HOME", "XDG_CONFIG_HOME"] as const;

let box: Sandbox;
let savedEnv: Partial<Record<(typeof HOME_VARIABLES)[number], string>>;
let output: string[];

beforeEach(() => {
  box = sandbox();
  savedEnv = {};
  for (const name of HOME_VARIABLES) {
    savedEnv[name] = process.env[name];
    delete process.env[name];
  }
  process.env.HOME = box.home;
  output = [];
  mock.method(console, "log", (message = "") => output.push(String(message)));
});
afterEach(() => {
  mock.restoreAll();
  for (const name of HOME_VARIABLES) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
  box.cleanup();
});

const p = (...parts: string[]) => path.join(box.home, ...parts);

interface Answers {
  agents?: string[] | Cancel;
  files?: (checked: string[]) => string[];
  proceed?: boolean | Cancel;
  plugin?: boolean | Cancel;
  scope?: Mode | Cancel;
  setup?: string[] | Cancel;
}

interface FileOption {
  checked: boolean;
  disabled: boolean;
  hint?: string;
  label?: string;
}

interface SetupQuestion {
  initialValues: unknown[];
  offered: unknown[];
}

const NO_CLAUDE: PluginInstaller = {
  available: () => false,
  install: () => {
    throw new Error("Unexpected plugin install");
  },
};

const PLUGIN_QUESTION = "Install the dotagents plugin for Claude Code?";

function makeClaudePlugin(log: string[], result: PluginInstall = { kind: "installed" }): PluginInstaller {
  return {
    available: () => true,
    install: () => {
      log.push(`plugin install, files installed: ${exists(p(".config", "dotagents", "manifest.json"))}`);
      return result;
    },
  };
}

const SETUP_QUESTION = "Set up this repository?";
const FILES_QUESTION = "Which files do you want to create?";

function makePrompts(answers: Answers): Prompts & { asked: string[]; fileOptions: FileOption[]; notes: string[]; setupQuestions: SetupQuestion[] } {
  const asked: string[] = [];
  const fileOptions: FileOption[] = [];
  const notes: string[] = [];
  const setupQuestions: SetupQuestion[] = [];
  return {
    asked,
    fileOptions,
    notes,
    setupQuestions,
    async confirm({ message }) {
      asked.push(message);
      if (message === PLUGIN_QUESTION) return answers.plugin ?? true;
      return answers.proceed ?? true;
    },
    async multiselect<Value>({ message, initialValues, options }: { message: string; initialValues: Value[]; options: { disabled?: boolean; hint?: string; label?: string; value: Value }[] }) {
      asked.push(message);
      if (message === FILES_QUESTION) {
        for (const { disabled = false, hint, label, value } of options) fileOptions.push({ checked: initialValues.includes(value), disabled, hint, label });
        return (answers.files?.(initialValues as string[]) ?? initialValues) as Value[];
      }
      if (message !== SETUP_QUESTION) return (answers.agents ?? initialValues) as Value[] | Cancel;
      setupQuestions.push({ initialValues, offered: options.map((option) => option.value) });
      return (answers.setup ?? initialValues) as Value[] | Cancel;
    },
    note(message, title) {
      notes.push(`${title}\n${message}`);
    },
    async select<Value>({ message, initialValue }: { message: string; initialValue?: Value }) {
      asked.push(message);
      return (answers.scope ?? initialValue) as Value | Cancel;
    },
  };
}

test("the install wizard installs for the checked agents after the confirmation", async () => {
  const prompts = makePrompts({ agents: ["codex", "copilot"], proceed: true });

  const ok = await installWizard(prompts, NO_CLAUDE, { cwd: box.home });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, ["Which agents do you use?", "Proceed with installation?"]);
  assert.ok(exists(p(".agents", "skills", "dot-plan", "SKILL.md")));
  assert.match(read(p(".codex", "AGENTS.md")), /<!-- dotagents:start -->/);
  assert.match(read(p(".copilot", "copilot-instructions.md")), /<!-- dotagents:start -->/);
  assert.ok(!exists(p(".claude")), "Claude Code was not checked");
  assert.deepEqual(JSON.parse(read(p(".config", "dotagents", "manifest.json"))).agents, ["codex", "copilot"]);
});

test("the install wizard writes nothing when the user answers No", async () => {
  const prompts = makePrompts({ proceed: false });

  const ok = await installWizard(prompts, NO_CLAUDE, { cwd: box.home });

  assert.equal(ok, false);
  assert.deepEqual(tree(box.home), []);
  assert.ok(output.includes("Cancelled. Nothing changed."));
});

test("the install wizard writes nothing when the user cancels", async () => {
  const prompts = makePrompts({ agents: CANCEL });

  const ok = await installWizard(prompts, NO_CLAUDE, { cwd: box.home });

  assert.equal(ok, false);
  assert.deepEqual(prompts.asked, ["Which agents do you use?"]);
  assert.deepEqual(tree(box.home), []);
  assert.ok(output.includes("Cancelled. Nothing changed."));
});

test("the install wizard reports a conflict and does not overwrite a file that dotagents did not write", async () => {
  const foreign = p(".agents", "skills", "dot-plan", "SKILL.md");
  write(foreign, "mine\n");
  const prompts = makePrompts({ proceed: true });

  const ok = await installWizard(prompts, NO_CLAUDE, { cwd: box.home });

  assert.equal(ok, false);
  assert.equal(read(foreign), "mine\n");
  assert.equal(prompts.notes.length, 1);
  assert.match(prompts.notes[0] ?? "", /dot-plan[/\\]SKILL\.md: exists and wasn't written by dotagents/);
});

test("the install wizard skips the agents step when the agents are given", async () => {
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["codex"], cwd: box.home });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, ["Proceed with installation?"]);
  assert.deepEqual(JSON.parse(read(p(".config", "dotagents", "manifest.json"))).agents, ["codex"]);
});

const NO_CHANGES: ApplyResult = { changes: [], entries: [], problems: [] };

test("the summary groups the skill files by target directory with a count for each action", () => {
  const changes: Change[] = [
    { action: "create", path: p(".agents", "skills", "dot-plan", "SKILL.md") },
    { action: "create", path: p(".agents", "skills", "dot-plan", "references", "example.md") },
    { action: "update", path: p(".agents", "skills", "dot-commit", "SKILL.md") },
    { action: "remove", path: p(".agents", "skills", "dot-old", "SKILL.md") },
    { action: "create", path: p(".claude", "rules", "dotagents.md") },
    { action: "add block to", path: p(".codex", "AGENTS.md") },
    { action: "update block in", path: p(".copilot", "copilot-instructions.md") },
    { action: "remove block from", path: p("elsewhere", "AGENTS.md") },
  ];

  const lines = summaryLines({ ...NO_CHANGES, changes });

  assert.deepEqual(lines, [
    `~${path.sep}${path.join(".agents", "skills")}: create 2 files, update 1 file, remove 1 file`,
    `~${path.sep}${path.join(".claude", "rules", "dotagents.md")}: create 1 file`,
    `~${path.sep}${path.join(".codex", "AGENTS.md")}: add block to 1 file`,
    `~${path.sep}${path.join(".copilot", "copilot-instructions.md")}: update block in 1 file`,
    `~${path.sep}${path.join("elsewhere", "AGENTS.md")}: remove block from 1 file`,
  ]);
});

test("the summary lists each problem", () => {
  const problems = ["/repo/a.md: modified locally, skipped (use --force to overwrite)", "/repo/b.md: exists and wasn't written by dotagents (use --force to overwrite)"];

  const lines = summaryLines({ ...NO_CHANGES, changes: [{ action: "create", path: p(".codex", "AGENTS.md") }], problems });

  assert.deepEqual(lines.slice(1), problems);
});

test("the summary says that the install is up to date when nothing changes", () => {
  const lines = summaryLines(NO_CHANGES);

  assert.deepEqual(lines, ["Already up to date."]);
});

const SCOPE_QUESTION = "Where do you want to install dotagents?";
const globalManifest = () => p(".config", "dotagents", "manifest.json");

test("the install wizard installs into the repository when the user picks the repository scope", async () => {
  const repo = box.repo();
  const prompts = makePrompts({ scope: "project" });

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["claude"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, [SCOPE_QUESTION, SETUP_QUESTION, "Proceed with installation?"]);
  assert.ok(exists(path.join(repo, ".dotagents.json")));
  assert.ok(exists(path.join(repo, ".claude", "skills", "dot-plan", "SKILL.md")));
  assert.ok(!exists(globalManifest()));
  assert.ok(output.includes("Commit the new files so that collaborators get them too."));
});

test("the install wizard asks no scope question outside a Git repository", async () => {
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["codex"], cwd: box.home });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(!prompts.asked.includes(SCOPE_QUESTION));
  assert.ok(exists(globalManifest()));
});

test("the install wizard installs globally when Git is not installed", async () => {
  const repo = box.repo();
  const prompts = makePrompts({});
  const savedPath = process.env.PATH;
  process.env.PATH = box.home;

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["codex"], cwd: repo }).finally(() => {
    process.env.PATH = savedPath;
  });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(!prompts.asked.includes(SCOPE_QUESTION));
  assert.ok(exists(globalManifest()));
});

test("the scope step offers the global scope as the default", async () => {
  const repo = box.repo();
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(prompts.asked.includes(SCOPE_QUESTION));
  assert.ok(exists(globalManifest()));
  assert.ok(!exists(path.join(repo, ".dotagents.json")));
});

test("the plugin step runs the installer after the confirmation when the user accepts it", async () => {
  const prompts = makePrompts({ plugin: true });
  const plugin = makeClaudePlugin(prompts.asked);

  const ok = await installWizard(prompts, plugin, { agents: ["claude"], cwd: box.home });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, [PLUGIN_QUESTION, "Proceed with installation?", "plugin install, files installed: true"]);
  assert.ok(!output.includes(PLUGIN_HINT));
});

test("the install wizard skips the plugin step when the plugin is installed", async () => {
  write(p(".claude", "plugins", "installed_plugins.json"), JSON.stringify({ plugins: { "dotagents@dotagents": [] } }));
  const prompts = makePrompts({});
  const plugin = makeClaudePlugin(prompts.asked);

  const ok = await installWizard(prompts, plugin, { agents: ["claude"], cwd: box.home });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, ["Proceed with installation?"]);
});

test("the install wizard skips the plugin step in the repository scope", async () => {
  const repo = box.repo();
  const prompts = makePrompts({ scope: "project" });
  const plugin = makeClaudePlugin(prompts.asked);

  const ok = await installWizard(prompts, plugin, { agents: ["claude"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, [SCOPE_QUESTION, SETUP_QUESTION, "Proceed with installation?"]);
});

test("the summary shows the /plugin commands when claude is not on the PATH", async () => {
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["claude"], cwd: box.home });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(!prompts.asked.includes(PLUGIN_QUESTION));
  assert.match(prompts.notes[0] ?? "", /\/plugin marketplace add igorlau\/dotagents/);
  assert.ok(!output.includes(PLUGIN_HINT), "the summary already showed the commands");
});

test("the install wizard shows the /plugin commands once when the user declines the plugin step", async () => {
  const prompts = makePrompts({ plugin: false });
  const plugin = makeClaudePlugin(prompts.asked);

  const ok = await installWizard(prompts, plugin, { agents: ["claude"], cwd: box.home });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, [PLUGIN_QUESTION, "Proceed with installation?"]);
  assert.equal(output.filter((line) => line === PLUGIN_HINT).length, 1);
});

test("the install continues and shows the /plugin commands when the plugin install fails", async () => {
  const prompts = makePrompts({ plugin: true });
  const plugin = makeClaudePlugin(prompts.asked, { kind: "failed", output: "marketplace unreachable" });

  const ok = await installWizard(prompts, plugin, { agents: ["claude", "codex"], cwd: box.home });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(output.includes("marketplace unreachable"));
  assert.ok(output.includes(PLUGIN_HINT));
  assert.ok(exists(p(".claude", "rules", "dotagents.md")));
  assert.ok(exists(globalManifest()));
});

const CHECK_SCRIPT = { "package.json": JSON.stringify({ scripts: { check: "tsc" } }) };
const configFile = () => p(".config", "dotagents", "config.json");

test("the install wizard enables the check hook when the user accepts it", async () => {
  const repo = box.repo({ ...CHECK_SCRIPT, "AGENTS.md": "# Team\n" });
  const prompts = makePrompts({ setup: ["check"] });

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(JSON.parse(read(configFile())).checkRepos, [fs.realpathSync(repo)]);
});

test("the install wizard does not offer the check hook without a check script", async () => {
  const repo = box.repo({ "AGENTS.md": "# Team\n" });
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(!prompts.asked.includes(SETUP_QUESTION));
});

test("the install wizard does not offer the check hook when it is enabled", async () => {
  const repo = box.repo({ Makefile: "check:\n\ttrue\n", "AGENTS.md": "# Team\n" });
  write(configFile(), JSON.stringify({ checkRepos: [fs.realpathSync(repo)] }));
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(!prompts.asked.includes(SETUP_QUESTION));
});

test("the install wizard does not offer scaffold when AGENTS.md exists", async () => {
  const repo = box.repo({ ...CHECK_SCRIPT, "AGENTS.md": "# Team\n" });
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.setupQuestions.map((question) => question.offered), [["check"]]);
});

test("the install wizard runs scaffold before init, so init writes the rules only in AGENTS.md", async () => {
  const repo = box.repo();
  const prompts = makePrompts({ scope: "project", setup: ["scaffold"] });

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["claude"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.match(read(path.join(repo, "CLAUDE.md")), /^@AGENTS\.md$/m);
  assert.match(read(path.join(repo, "AGENTS.md")), /<!-- dotagents:start -->/);
  assert.ok(!exists(path.join(repo, ".claude", "rules", "dotagents.md")));
});

test("the check and scaffold steps come unchecked", async () => {
  const repo = box.repo(CHECK_SCRIPT);
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.setupQuestions, [{ initialValues: [], offered: ["check", "scaffold"] }]);
  assert.ok(!exists(path.join(repo, "AGENTS.md")));
  assert.ok(!exists(configFile()));
});

test("the summary matches the files after scaffold and the repository install", async () => {
  const repo = box.repo();
  const prompts = makePrompts({ scope: "project", setup: ["scaffold"] });

  await installWizard(prompts, NO_CLAUDE, { agents: ["claude"], cwd: repo });

  assert.doesNotMatch(prompts.notes[0] ?? "", /rules[/\\]dotagents\.md/);
  assert.ok(!exists(path.join(repo, ".claude", "rules", "dotagents.md")));
});

test("scaffold in the wizard keeps a team CLAUDE.md and reports no problem", async () => {
  const repo = box.repo({ "CLAUDE.md": "# Team rules for Claude\n" });
  const prompts = makePrompts({ scope: "project", setup: ["scaffold"] });

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["claude"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.doesNotMatch(prompts.notes[0] ?? "", /wasn't written by dotagents/);
  assert.equal(read(path.join(repo, "CLAUDE.md")), "# Team rules for Claude\n");
  assert.ok(exists(path.join(repo, "AGENTS.md")));
});

const SCAFFOLD_FILES = [".claude/settings.json", ".editorconfig", ".gitattributes", "AGENTS.md", "CLAUDE.md"];
const scaffolded = (repo: string) => SCAFFOLD_FILES.filter((file) => exists(path.join(repo, file)));

test("the scaffold wizard offers only AGENTS.md, .editorconfig, and .gitattributes for Codex and Copilot", async () => {
  const repo = box.repo();
  const prompts = makePrompts({});

  const ok = await scaffoldWizard(prompts, { agents: ["codex", "copilot"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.fileOptions.map((option) => option.label), [".editorconfig", ".gitattributes", "AGENTS.md"]);
  assert.deepEqual(scaffolded(repo), [".editorconfig", ".gitattributes", "AGENTS.md"]);
});

test("the scaffold wizard creates a CLAUDE.md with only @AGENTS.md for Claude Code and Copilot", async () => {
  const repo = box.repo();
  const prompts = makePrompts({ agents: ["claude", "copilot"] });

  const ok = await scaffoldWizard(prompts, { cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, ["Which agents do you use?", FILES_QUESTION, "Create these files?"]);
  assert.equal(read(path.join(repo, "CLAUDE.md")).trim(), "@AGENTS.md");
});

test("the scaffold wizard marks existing files as skipped and leaves them unchanged", async () => {
  const repo = box.repo({ ".editorconfig": "root = true\n" });
  const prompts = makePrompts({});

  const ok = await scaffoldWizard(prompts, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.fileOptions[0], { checked: false, disabled: true, hint: "exists, skip", label: ".editorconfig" });
  assert.ok(prompts.fileOptions.slice(1).every((option) => option.checked && !option.disabled));
  assert.equal(read(path.join(repo, ".editorconfig")), "root = true\n");
  assert.doesNotMatch(prompts.notes[0] ?? "", /editorconfig/);
});

test("the scaffold wizard creates only the files that the user keeps checked", async () => {
  const repo = box.repo();
  const prompts = makePrompts({ files: (checked) => checked.filter((file) => !file.endsWith(".gitattributes")) });

  const ok = await scaffoldWizard(prompts, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(scaffolded(repo), [".editorconfig", "AGENTS.md"]);
});

test("the scaffold wizard stops before the files step when every file exists", async () => {
  const repo = box.repo({ ".editorconfig": "root = true\n", ".gitattributes": "* text=auto\n", "AGENTS.md": "# Team\n" });
  const prompts = makePrompts({});

  const ok = await scaffoldWizard(prompts, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true);
  assert.deepEqual(prompts.asked, []);
  assert.ok(output.includes("Every scaffold file exists. Nothing changed."));
});

test("the scaffold wizard fails outside a Git repository before the first prompt", async () => {
  const prompts = makePrompts({});

  await assert.rejects(scaffoldWizard(prompts, { cwd: box.home }), /Not inside a Git repository/);

  assert.deepEqual(prompts.asked, []);
});

test("the scaffold wizard writes nothing when the user answers No", async () => {
  const repo = box.repo();
  const prompts = makePrompts({ proceed: false });

  const ok = await scaffoldWizard(prompts, { agents: ["claude"], cwd: repo });

  assert.equal(ok, false);
  assert.deepEqual(scaffolded(repo), []);
  assert.ok(output.includes("Cancelled. Nothing changed."));
});

const IMPORT_HINT = "CLAUDE.md does not import AGENTS.md. Add the line `@AGENTS.md` to CLAUDE.md so Claude Code reads it, then run `dotagents update`.";
const TEAM_CLAUDE_MD = { "CLAUDE.md": "# Team rules for Claude\n" };

test("the scaffold wizard shows the import hint when a team CLAUDE.md does not import AGENTS.md", async () => {
  const repo = box.repo(TEAM_CLAUDE_MD);
  const prompts = makePrompts({});

  const ok = await scaffoldWizard(prompts, { agents: ["claude"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.ok((prompts.notes[0] ?? "").includes(IMPORT_HINT));
  assert.ok(output.includes(IMPORT_HINT));
  assert.equal(read(path.join(repo, "CLAUDE.md")), TEAM_CLAUDE_MD["CLAUDE.md"]);
  assert.ok(exists(path.join(repo, "AGENTS.md")));
});

test("the install wizard shows the import hint after scaffold next to a team CLAUDE.md", async () => {
  const repo = box.repo(TEAM_CLAUDE_MD);
  const prompts = makePrompts({ scope: "project", setup: ["scaffold"] });

  const ok = await installWizard(prompts, NO_CLAUDE, { agents: ["claude"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.ok((prompts.notes[0] ?? "").includes(IMPORT_HINT));
  assert.equal(output.at(-1), IMPORT_HINT);
  assert.equal(read(path.join(repo, "CLAUDE.md")), TEAM_CLAUDE_MD["CLAUDE.md"]);
});

test("the wizards show no import hint when CLAUDE.md imports AGENTS.md or Claude Code is not checked", async () => {
  const importing = box.repo({ "CLAUDE.md": "# Team rules for Claude\n\n@AGENTS.md\n" });
  const withoutClaude = box.repo(TEAM_CLAUDE_MD);
  const importingPrompts = makePrompts({});
  const withoutClaudePrompts = makePrompts({});

  await scaffoldWizard(importingPrompts, { agents: ["claude"], cwd: importing });
  await scaffoldWizard(withoutClaudePrompts, { agents: ["codex"], cwd: withoutClaude });

  assert.ok(!(importingPrompts.notes[0] ?? "").includes(IMPORT_HINT));
  assert.ok(!(withoutClaudePrompts.notes[0] ?? "").includes(IMPORT_HINT));
  assert.ok(!output.includes(IMPORT_HINT));
});

const NO_FLAGS = { "dry-run": false, force: false, global: false, project: false };

test("the CLI opens the wizard in a terminal for no command, and for install with no flag other than --agents", () => {
  const cases = [
    { command: undefined, interactive: true, values: NO_FLAGS, opens: true },
    { command: "install", interactive: true, values: NO_FLAGS, opens: true },
    { command: "install", interactive: false, values: NO_FLAGS, opens: false },
    { command: undefined, interactive: false, values: NO_FLAGS, opens: false },
    { command: "init", interactive: true, values: NO_FLAGS, opens: false },
    { command: "install", interactive: true, values: { ...NO_FLAGS, "dry-run": true }, opens: false },
    { command: "install", interactive: true, values: { ...NO_FLAGS, force: true }, opens: false },
    { command: "install", interactive: true, values: { ...NO_FLAGS, global: true }, opens: false },
    { command: "install", interactive: true, values: { ...NO_FLAGS, project: true }, opens: false },
    { command: "install", interactive: true, values: { ...NO_FLAGS, source: "@igorlau/dotagents@1.0.0" }, opens: false },
  ];

  const results = cases.map(({ command, interactive, values }) => opensWizard({ command, interactive, values }));

  assert.deepEqual(results, cases.map(({ opens }) => opens));
});
