import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, mock, test } from "node:test";
import { CANCEL, installWizard, opensWizard, type Cancel, type Prompts } from "../src/wizard.ts";
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
}

function makePrompts(answers: Answers): Prompts & { asked: string[] } {
  const asked: string[] = [];
  return {
    asked,
    async confirm({ message }) {
      asked.push(message);
      return answers.proceed ?? true;
    },
    async multiselect<Value>({ message, initialValues }: { message: string; initialValues: Value[] }) {
      asked.push(message);
      return (answers.agents ?? initialValues) as Value[] | Cancel;
    },
    async select({ message }) {
      asked.push(message);
      throw new Error(`Unexpected select: ${message}`);
    },
  };
}

test("the install wizard installs for the checked agents after the confirmation", async () => {
  const prompts = makePrompts({ agents: ["codex", "copilot"], proceed: true });

  const ok = await installWizard(prompts, {});

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

  const ok = await installWizard(prompts, {});

  assert.equal(ok, false);
  assert.deepEqual(tree(box.home), []);
  assert.ok(output.includes("Cancelled. Nothing changed."));
});

test("the install wizard writes nothing when the user cancels", async () => {
  const prompts = makePrompts({ agents: CANCEL });

  const ok = await installWizard(prompts, {});

  assert.equal(ok, false);
  assert.deepEqual(prompts.asked, ["Which agents do you use?"]);
  assert.deepEqual(tree(box.home), []);
  assert.ok(output.includes("Cancelled. Nothing changed."));
});

test("the install wizard reports a conflict and does not overwrite a file that dotagents did not write", async () => {
  const foreign = p(".agents", "skills", "dot-plan", "SKILL.md");
  write(foreign, "mine\n");
  const prompts = makePrompts({ proceed: true });

  const ok = await installWizard(prompts, {});

  assert.equal(ok, false);
  assert.equal(read(foreign), "mine\n");
  const [, realInstall] = output.flatMap((line, index) => (line.startsWith("Installing") ? [index] : []));
  const summary = output.slice(0, realInstall).join("\n");
  assert.match(summary, /dot-plan[/\\]SKILL\.md: exists and wasn't written by dotagents/);
});

test("the install wizard skips the agents step when the agents are given", async () => {
  const prompts = makePrompts({});

  const ok = await installWizard(prompts, { agents: ["codex"] });

  assert.equal(ok, true, output.join("\n"));
  assert.deepEqual(prompts.asked, ["Proceed with installation?"]);
  assert.deepEqual(JSON.parse(read(p(".config", "dotagents", "manifest.json"))).agents, ["codex"]);
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
