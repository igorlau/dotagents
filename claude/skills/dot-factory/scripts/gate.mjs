// Usage: node gate.mjs --task <id> --roadmap <dir> --log <file>, from the repository root.
// Runs the repository's check and test commands, writes their output to the log file,
// and prints one result line. On a pass, it ticks the task in <dir>/README.md.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { checkCommand, testCommand, treeHash } from "../../../hooks/repo-commands.mjs";

const USAGE = "Usage: node gate.mjs --task <id> --roadmap <dir> --log <file>";

const { task, roadmap, log } = readArgs();
const cwd = process.cwd();
const readme = path.join(roadmap, "README.md");
const roadmapText = readRoadmap();
const tree = treeHash(cwd);
if (!tree) usage(`${cwd} is not a Git repository`);

const commands = [
  ["check", checkCommand(cwd)],
  ["test", testCommand(cwd)],
];
let reason = commands.some(([, command]) => command) ? undefined : "no-commands";
const output = [];
for (const [name, command] of commands) {
  if (!command) {
    output.push(`No ${name} command.\n`);
    continue;
  }
  const [program, ...args] = command;
  const result = spawnSync(program, args, { cwd, encoding: "utf8", shell: process.platform === "win32" });
  output.push(`$ ${command.join(" ")}\n${result.stdout ?? ""}${result.stderr ?? ""}${result.error?.message ?? ""}\nExit code: ${result.status}\n`);
  if (result.status !== 0) reason ??= name;
}
fs.mkdirSync(path.dirname(path.resolve(log)), { recursive: true });
fs.writeFileSync(log, output.join("\n"));

if (reason) {
  console.log(`gate fail task=${task} tree=${tree} log=${log} reason=${reason}`);
  process.exit(1);
}
fs.writeFileSync(readme, roadmapText.replace(`- [ ] [${task} `, `- [x] [${task} `));
console.log(`gate pass task=${task} tree=${tree} log=${log}`);

function readArgs() {
  try {
    const { values } = parseArgs({ options: { task: { type: "string" }, roadmap: { type: "string" }, log: { type: "string" } } });
    if (values.task && values.roadmap && values.log) return values;
  } catch (error) {
    usage(`${error.message}\n${USAGE}`);
  }
  usage(USAGE);
}

function readRoadmap() {
  let text;
  try {
    text = fs.readFileSync(readme, "utf8");
  } catch {
    usage(`Cannot read ${readme}`);
  }
  return text;
}

function usage(message) {
  console.error(message);
  process.exit(2);
}
