// Usage: node page.mjs <layers.json>, from inside the repository. Writes
// .tmp/stack-review/<branch-slug>.html at the repository root, and prints its path.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const SEVERITIES = ["high", "medium", "low"];
const KINDS = ["correctness", "maintainability"];
const MAX_DIFF = 64 * 1024 * 1024;

const layersFile = process.argv[2];
if (!layersFile) fail("Usage: node page.mjs <layers.json>");
const stack = readStack(layersFile);
validate(stack);

const root = git(["rev-parse", "--show-toplevel"]);
const mergeBase = git(["merge-base", stack.base, stack.head]);
// shortcut: a file that is split between 2 layers shows its full diff in both layers, split the diff by hunk when readers need only the hunks of each layer.
const diffs = new Map();
stack.layers.forEach((layer, i) => {
  layer.files.forEach((file, j) => {
    if (!diffs.has(file)) diffs.set(file, git(["--literal-pathspecs", "diff", "--no-color", "--no-ext-diff", mergeBase, stack.head, "--", file], root));
    if (!diffs.get(file)) invalid(`layers[${i}].files[${j}]`, "has no changes between the merge base and head");
  });
});

const page = path.join(root, ".tmp", "stack-review", `${stack.head.replace(/[^\w.-]/g, "-")}.html`);
fs.mkdirSync(path.dirname(page), { recursive: true });
fs.writeFileSync(page, renderPage());
console.log(page);

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readStack(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`Cannot read the layers file ${file}: ${error.message}`);
  }
}

function invalid(field, rule) {
  fail(`Invalid layers file: ${field} ${rule}.`);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function validate(stack) {
  if (!isObject(stack)) invalid("the root", "must be an object");
  for (const key of ["base", "head"]) {
    if (typeof stack[key] !== "string" || !/^[^-\s]\S*$/.test(stack[key])) invalid(key, "must be a branch or commit name without spaces that does not start with -");
  }
  if (!Array.isArray(stack.layers) || stack.layers.length === 0) invalid("layers", "must be a non-empty array");
  stack.layers.forEach((layer, index) => {
    const at = `layers[${index}]`;
    if (!isObject(layer)) invalid(at, "must be an object");
    for (const key of ["name", "purpose"]) {
      if (!isText(layer[key])) invalid(`${at}.${key}`, "must be a non-empty string");
    }
    if (!Array.isArray(layer.dependsOn) || !layer.dependsOn.every((number) => Number.isInteger(number) && number >= 1 && number <= index)) {
      invalid(`${at}.dependsOn`, `must list only earlier layers, as 1-based numbers below ${index + 1}`);
    }
    if (!Array.isArray(layer.files) || layer.files.length === 0 || !layer.files.every(isText)) invalid(`${at}.files`, "must be a non-empty array of file paths");
    if (!Array.isArray(layer.findings)) invalid(`${at}.findings`, "must be an array");
    layer.findings.forEach((finding, findingIndex) => {
      const findingAt = `${at}.findings[${findingIndex}]`;
      if (!isObject(finding)) invalid(findingAt, "must be an object");
      for (const key of ["body", "summary"]) {
        if (!isText(finding[key])) invalid(`${findingAt}.${key}`, "must be a non-empty string");
      }
      if (!layer.files.includes(finding.file)) invalid(`${findingAt}.file`, `must be one of the files of ${at}`);
      if (!Number.isInteger(finding.line) || finding.line < 1) invalid(`${findingAt}.line`, "must be a line number from 1");
      if (!SEVERITIES.includes(finding.severity)) invalid(`${findingAt}.severity`, `must be one of ${SEVERITIES.join(", ")}`);
      if (!KINDS.includes(finding.kind)) invalid(`${findingAt}.kind`, `must be one of ${KINDS.join(", ")}`);
    });
  });
}

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", maxBuffer: MAX_DIFF });
  if (result.status !== 0) fail(`git ${args.join(" ")} failed: ${(result.stderr || result.error?.message || "").trim()}`);
  return result.stdout.trimEnd();
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function severityCounts(findings) {
  const counts = SEVERITIES.map((severity) => [severity, findings.filter((finding) => finding.severity === severity).length]).filter(([, count]) => count > 0);
  if (counts.length === 0) return `<span class="clean">clean</span>`;
  return counts.map(([severity, count]) => `<span class="sev ${severity}">${severity} ${count}</span>`).join(" ");
}

function dependencies(layer) {
  if (layer.dependsOn.length === 0) return "nothing";
  return `${layer.dependsOn.length === 1 ? "layer" : "layers"} ${layer.dependsOn.join(", ")}`;
}

function diffLines(diff) {
  let inHeader = true;
  return diff.split("\n").map((line) => {
    if (line.startsWith("@@")) inHeader = false;
    if (inHeader) return { kind: "meta", line };
    if (line.startsWith("@@")) return { kind: "hunk", line };
    if (line.startsWith("+")) return { kind: "add", line };
    if (line.startsWith("-")) return { kind: "del", line };
    return { kind: "context", line };
  });
}

function renderFinding(finding) {
  return `<div class="finding ${finding.severity}">
<p><span class="sev ${finding.severity}">${finding.severity}</span> ${escapeHtml(finding.summary)}</p>
<p><code>${escapeHtml(`${finding.file}:${finding.line}`)}</code> (${finding.kind})</p>
<div class="body">${escapeHtml(finding.body)}</div>
</div>`;
}

function renderFile(file, layer) {
  const diff = diffs.get(file);
  const lines = diffLines(diff);
  const added = lines.filter((entry) => entry.kind === "add").length;
  const deleted = lines.filter((entry) => entry.kind === "del").length;
  const findings = layer.findings.filter((finding) => finding.file === file).map(renderFinding).join("\n");
  const body = lines.map((entry) => `<span class="${entry.kind}">${escapeHtml(entry.line) || " "}</span>`).join("");
  return `<details class="file" open>
<summary><code>${escapeHtml(file)}</code> <span class="add-count">+${added}</span> <span class="del-count">-${deleted}</span></summary>
${findings}
<pre class="diff">${body}</pre>
</details>`;
}

function renderLayer(layer, index) {
  return `<details class="layer" id="layer-${index + 1}" open>
<summary><h2>Layer ${index + 1}: ${escapeHtml(layer.name)}</h2> ${severityCounts(layer.findings)}</summary>
<p>Purpose: ${escapeHtml(layer.purpose)}</p>
<p>Depends on: ${dependencies(layer)}</p>
${layer.files.map((file) => renderFile(file, layer)).join("\n")}
</details>`;
}

function renderOverviewRow(layer, index) {
  const needs = layer.dependsOn.length ? `<span class="needs">needs ${layer.dependsOn.join(", ")}</span>` : "";
  return `<li><a href="#layer-${index + 1}"><span class="number">${index + 1}</span> ${escapeHtml(layer.name)}</a> <span class="count">${plural(layer.files.length, "file")}</span> ${severityCounts(layer.findings)} ${needs}</li>`;
}

function renderPage() {
  const title = `${stack.head} vs ${stack.base}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root { color-scheme: light dark; --bg: #ffffff; --fg: #1f2328; --muted: #59636e; --border: #d1d9e0; --panel: #f6f8fa; --add-bg: #dafbe1; --del-bg: #ffebe9; --hunk-bg: #ddf4ff; --high: #cf222e; --medium: #9a6700; --low: #0969da; --clean: #1a7f37; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #0d1117; --fg: #e6edf3; --muted: #9198a1; --border: #3d444d; --panel: #151b23; --add-bg: #12361f; --del-bg: #3d1418; --hunk-bg: #0c2d4a; --high: #ff7b72; --medium: #d29922; --low: #58a6ff; --clean: #3fb950; }
}
* { box-sizing: border-box; }
body { margin: 0 auto; max-width: 1200px; padding: 16px; background: var(--bg); color: var(--fg); font: 15px/1.5 system-ui, sans-serif; }
code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; }
a { color: var(--low); }
h1 { font-size: 1.4em; margin: 0 0 4px; overflow-wrap: anywhere; }
h2 { display: inline; font-size: 1.15em; margin: 0; }
.meta-line { color: var(--muted); margin: 0 0 16px; }
.stack { list-style: none; margin: 0 0 24px; padding: 0; border: 1px solid var(--border); border-radius: 6px; }
.stack li { display: flex; flex-wrap: wrap; gap: 4px 12px; padding: 8px 12px; border-top: 1px solid var(--border); }
.stack li:first-child { border-top: 0; }
.stack a { min-width: 12em; font-weight: 600; text-decoration: none; }
.number { display: inline-block; min-width: 1.5em; color: var(--muted); }
.count, .needs { color: var(--muted); }
.sev { font-weight: 600; }
.sev.high { color: var(--high); }
.sev.medium { color: var(--medium); }
.sev.low { color: var(--low); }
.clean { color: var(--clean); }
details.layer { margin: 0 0 16px; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; }
details.layer > summary { cursor: pointer; }
details.file { margin: 12px 0; border: 1px solid var(--border); border-radius: 6px; }
details.file > summary { cursor: pointer; padding: 6px 10px; background: var(--panel); overflow-wrap: anywhere; }
.add-count { color: var(--clean); }
.del-count { color: var(--high); }
.finding { margin: 8px 10px; padding: 4px 10px; border-left: 4px solid var(--border); background: var(--panel); }
.finding.high { border-left-color: var(--high); }
.finding.medium { border-left-color: var(--medium); }
.finding.low { border-left-color: var(--low); }
.finding p { margin: 4px 0; overflow-wrap: anywhere; }
.finding .body { white-space: pre-wrap; overflow-wrap: anywhere; margin: 4px 0; }
pre.diff { margin: 0; overflow-x: auto; line-height: 1.4; }
pre.diff span { display: block; padding: 0 10px; min-width: max-content; }
pre.diff .meta { color: var(--muted); }
pre.diff .hunk { background: var(--hunk-bg); color: var(--muted); }
pre.diff .add { background: var(--add-bg); }
pre.diff .del { background: var(--del-bg); }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p class="meta-line">Merge base <code>${mergeBase.slice(0, 7)}</code></p>
<ol class="stack">
${stack.layers.map(renderOverviewRow).join("\n")}
</ol>
${stack.layers.map(renderLayer).join("\n")}
</body>
</html>
`;
}
