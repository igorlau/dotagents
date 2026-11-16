import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, mock, test } from "node:test";
import type { ApplyResult, Change } from "../src/apply.ts";
import { CANCEL, installWizard, opensWizard, summaryLines, type Cancel, type Prompts } from "../src/wizard.ts";
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
  proceed?: boolean | Cancel;
  scope?: Mode | Cancel;
}

function makePrompts(answers: Answers): Prompts & { asked: string[]; notes: string[] } {
  const asked: string[] = [];
  const notes: string[] = [];
  return {
    asked,
    notes,
    async confirm({ message }) {
      asked.push(message);
      return answers.proceed ?? true;
    },
    async multiselect<Value>({ message, initialValues }: { message: string; initialValues: Value[] }) {
      asked.push(message);
      return (answers.agents ?? initialValues) as Value[] | Cancel;
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

  const ok = await installWizard(prompts, { cwd: box.home });

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

  const ok = await installWizard(prompts, { cwd: box.home });

  assert.equal(ok, false);
  assert.deepEqual(tree(box.home), []);
  assert.ok(output.includes("Cancelled. Nothing changed."));
});

test("the install wizard writes nothing when the user cancels", async () => {
  const prompts = makePrompts({ agents: CANCEL });

  const ok = await installWizard(prompts, { cwd: box.home });

  assert.equal(ok, false);
  assert.deepEqual(prompts.asked, ["Which agents do you use?"]);
  assert.deepEqual(tree(box.home), []);
  assert.ok(output.includes("Cancelled. Nothing changed."));
});

test("the install wizard reports a conflict and does not overwrite a file that dotagents did not write", async () => {
  const foreign = p(".agents", "skills", "dot-plan", "SKILL.md");
  write(foreign, "mine\n");
  const prompts = makePrompts({ proceed: true });

  const ok = await installWizard(prompts, { cwd: box.home });

  assert.equal(ok, false);
  assert.equal(read(foreign), "mine\n");
  assert.equal(prompts.notes.length, 1);
  assert.match(prompts.notes[0] ?? "", /dot-plan[/\\]SKILL\.md: exists and wasn't written by dotagents/);
});

test("the install wizard skips the agents step when the agents are given", async () => {
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, { agents: ["codex"], cwd: box.home });

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

  const ok = await installWizard(prompts, { agents: ["claude"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, [SCOPE_QUESTION, "Proceed with installation?"]);
  assert.ok(exists(path.join(repo, ".dotagents.json")));
  assert.ok(exists(path.join(repo, ".claude", "skills", "dot-plan", "SKILL.md")));
  assert.ok(!exists(globalManifest()));
  assert.ok(output.includes("Commit the new files so that collaborators get them too."));
});

test("the install wizard asks no scope question outside a Git repository", async () => {
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, { agents: ["codex"], cwd: box.home });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(!prompts.asked.includes(SCOPE_QUESTION));
  assert.ok(exists(globalManifest()));
});

test("the install wizard installs globally when Git is not installed", async () => {
  const repo = box.repo();
  const prompts = makePrompts({});
  const savedPath = process.env.PATH;
  process.env.PATH = box.home;

  const ok = await installWizard(prompts, { agents: ["codex"], cwd: repo }).finally(() => {
    process.env.PATH = savedPath;
  });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(!prompts.asked.includes(SCOPE_QUESTION));
  assert.ok(exists(globalManifest()));
});

test("the scope step offers the global scope as the default", async () => {
  const repo = box.repo();
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, { agents: ["codex"], cwd: repo });

  assert.equal(ok, true, output.join("\n"));
  assert.ok(prompts.asked.includes(SCOPE_QUESTION));
  assert.ok(exists(globalManifest()));
  assert.ok(!exists(path.join(repo, ".dotagents.json")));
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
