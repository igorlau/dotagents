// Usage: node page.mjs <layers.json>, from inside the repository. Writes
// .tmp/walkthrough/<slug>.html at the repository root, and prints its path.
// The layers file names the target with "base" and "head" (a branch), with "oldTree" and
// "newTree" (a tree range), or with none of them (the working tree against HEAD).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SEVERITIES = ["high", "medium", "low"];
const KINDS = ["correctness", "maintainability"];
const MAX_DIFF = 64 * 1024 * 1024;

const layersFile = process.argv[2];
if (!layersFile) fail("Usage: node page.mjs <layers.json>");
const stack = readStack(layersFile);
validate(stack);

const root = git(["rev-parse", "--show-toplevel"]);
const target = resolveTarget();
// shortcut: a file that is split between 2 layers shows its full diff in both layers, split the diff by hunk when readers need only the hunks of each layer.
const diffs = new Map();
stack.layers.forEach((layer, i) => {
  layer.files.forEach((file, j) => {
    if (!diffs.has(file)) diffs.set(file, git(["--literal-pathspecs", "diff", "--no-color", "--no-ext-diff", target.from, target.to, "--", file], root));
    if (!diffs.get(file)) invalid(`layers[${i}].files[${j}]`, "has no changes in the target");
  });
});

const page = path.join(root, ".tmp", "walkthrough", `${target.slug.replace(/[^\w.-]/g, "-")}.html`);
fs.mkdirSync(path.dirname(page), { recursive: true });
fs.rmSync(page, { force: true });
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
    if (key in stack && (typeof stack[key] !== "string" || !/^[^-\s]\S*$/.test(stack[key]))) invalid(key, "must be a branch or commit name without spaces that does not start with -");
  }
  if ("base" in stack !== "head" in stack) invalid("base and head", "must both be present or both be absent");
  for (const key of ["oldTree", "newTree"]) {
    if (key in stack && (typeof stack[key] !== "string" || !/^[0-9a-f]{4,64}$/.test(stack[key]))) invalid(key, "must be a tree id in lowercase hexadecimal");
  }
  if ("oldTree" in stack !== "newTree" in stack) invalid("oldTree and newTree", "must both be present or both be absent");
  if ("base" in stack && "oldTree" in stack) invalid("base", "cannot go with oldTree: name a branch or a tree range, not both");
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

function resolveTarget() {
  if ("head" in stack) {
    const mergeBase = git(["merge-base", stack.base, stack.head]);
    return { from: mergeBase, slug: stack.head, subtitle: `Merge base <code>${mergeBase.slice(0, 7)}</code>`, title: `${stack.head} vs ${stack.base}`, to: stack.head };
  }
  if ("oldTree" in stack) {
    const [from, to] = [stack.oldTree, stack.newTree].map((id) => git(["rev-parse", "--verify", "--end-of-options", `${id}^{tree}`], root));
    const range = `${from.slice(0, 12)}..${to.slice(0, 12)}`;
    return { from, slug: `tree-${range}`, subtitle: "Tree range", title: range, to };
  }
  const indexDir = fs.mkdtempSync(path.join(os.tmpdir(), "walkthrough-"));
  process.once("exit", () => fs.rmSync(indexDir, { recursive: true, force: true }));
  const env = { ...process.env, GIT_INDEX_FILE: path.join(indexDir, "index") };
  git(["read-tree", "HEAD"], root, env);
  // shortcut: git add writes every changed and untracked file as a loose object into the real object database, point GIT_OBJECT_DIRECTORY at a temporary directory with the real one as an alternate when that growth matters.
  git(["add", "--all", "--", "."], root, env);
  return { from: "HEAD", slug: "working-tree", subtitle: "Working tree against <code>HEAD</code>", title: "working tree", to: git(["write-tree"], root, env) };
}

function git(args, cwd, env = process.env) {
  const result = spawnSync("git", args, { cwd, env, encoding: "utf8", maxBuffer: MAX_DIFF });
  if (result.status !== 0) fail(`git ${args.join(" ")} failed: ${(result.stderr || result.error?.message || "").trim()}`);
  return result.stdout.trimEnd();
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function badge(className, text) {
  return `<span class="badge ${className}">${text}</span>`;
}

function severityCounts(findings) {
  const counts = SEVERITIES.map((severity) => [severity, findings.filter((finding) => finding.severity === severity).length]).filter(([, count]) => count > 0);
  if (counts.length === 0) return badge("clean", "clean");
  return counts.map(([severity, count]) => badge(severity, `${severity} ${count}`)).join(" ");
}

function dependencies(layer) {
  if (layer.dependsOn.length === 0) return "nothing";
  return `${layer.dependsOn.length === 1 ? "layer" : "layers"} ${layer.dependsOn.join(", ")}`;
}

function diffRows(diff) {
  const rows = [];
  let oldLine = 0;
  let newLine = 0;
  let inHeader = true;
  for (const line of diff.split("\n")) {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      inHeader = false;
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      rows.push({ kind: "hunk", line });
      continue;
    }
    if (inHeader) {
      if (!/^(diff --git |index |--- |\+\+\+ )/.test(line)) rows.push({ kind: "meta", line });
      continue;
    }
    if (line.startsWith("+")) {
      rows.push({ kind: "add", line, newLine: newLine++ });
      continue;
    }
    if (line.startsWith("-")) {
      rows.push({ kind: "del", line, oldLine: oldLine++ });
      continue;
    }
    if (line.startsWith("\\")) {
      rows.push({ kind: "meta", line });
      continue;
    }
    rows.push({ kind: "context", line, newLine: newLine++, oldLine: oldLine++ });
  }
  return rows;
}

function renderMarkdown(text) {
  return escapeHtml(text).replace(/`([^`]+)`|\*\*([^*]+)\*\*/g, (_, code, strong) => (code ? `<code>${code}</code>` : `<strong>${strong}</strong>`));
}

function renderFinding(finding, anchor) {
  const location = `<code>${escapeHtml(`${finding.file}:${finding.line}`)}</code>`;
  return `<div class="finding ${finding.severity}">
<p class="finding-head">${badge(finding.severity, finding.severity)} <strong>${escapeHtml(finding.summary)}</strong></p>
<p class="finding-meta">${anchor ? `<a href="#${anchor}">${location}</a>` : location} ${badge("kind", finding.kind)}</p>
<div class="body">${renderMarkdown(finding.body)}</div>
</div>`;
}

function renderRow(row, flag) {
  if (row.kind === "hunk" || row.kind === "meta") return `<tr class="${row.kind}"><td class="code" colspan="3">${escapeHtml(row.line)}</td></tr>`;
  const attributes = flag ? ` class="${row.kind} flagged ${flag.severity}" id="${flag.anchor}"` : ` class="${row.kind}"`;
  return `<tr${attributes}><td class="ln">${row.oldLine ?? ""}</td><td class="ln">${row.newLine ?? ""}</td><td class="code">${escapeHtml(row.line) || " "}</td></tr>`;
}

function renderFile(file, layer, layerIndex, fileIndex) {
  const rows = diffRows(diffs.get(file));
  const added = rows.filter((row) => row.kind === "add").length;
  const deleted = rows.filter((row) => row.kind === "del").length;
  const findings = layer.findings.filter((finding) => finding.file === file);
  const shownLines = new Set(rows.map((row) => row.newLine).filter(Number.isInteger));
  const anchorOf = (line) => (shownLines.has(line) ? `layer-${layerIndex + 1}-file-${fileIndex + 1}-line-${line}` : "");
  const flags = new Map();
  for (const severity of SEVERITIES.toReversed()) {
    for (const finding of findings.filter((candidate) => candidate.severity === severity)) flags.set(finding.line, { anchor: anchorOf(finding.line), severity });
  }
  const body = rows.map((row) => renderRow(row, row.kind === "del" ? undefined : flags.get(row.newLine))).join("\n");
  return `<details class="file" open>
<summary><code class="file-name">${escapeHtml(file)}</code> <span class="add-count">+${added}</span> <span class="del-count">-${deleted}</span></summary>
<div class="file-body">
${findings.map((finding) => renderFinding(finding, anchorOf(finding.line))).join("\n")}
<details class="diff-section">
<summary>Diff</summary>
<table class="diff"><colgroup><col class="ln"><col class="ln"><col></colgroup>
${body}
</table>
</details>
</div>
</details>`;
}

function renderLayer(layer, index) {
  return `<details class="layer" id="layer-${index + 1}" open>
<summary><h2>Layer ${index + 1}: ${escapeHtml(layer.name)}</h2> ${severityCounts(layer.findings)}</summary>
<div class="layer-body">
<p class="layer-meta">Purpose: ${escapeHtml(layer.purpose)}<br>Depends on: ${dependencies(layer)}</p>
${layer.files.map((file, fileIndex) => renderFile(file, layer, index, fileIndex)).join("\n")}
</div>
</details>`;
}

function renderOverviewRow(layer, index) {
  const needs = layer.dependsOn.length ? `<span class="needs">needs ${layer.dependsOn.join(", ")}</span>` : "";
  return `<li><a href="#layer-${index + 1}"><span class="number">${index + 1}</span><span class="name">${escapeHtml(layer.name)}</span><span class="count">${plural(layer.files.length, "file")}</span>${severityCounts(layer.findings)}${needs}</a></li>`;
}

function renderPage() {
  const { subtitle, title } = target;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root {
  color-scheme: light dark;
  --grouped: #f2f2f7; --card: #ffffff; --inset: #f2f2f7; --label: #1d1d1f; --secondary: rgba(60, 60, 67, 0.6); --separator: rgba(60, 60, 67, 0.16);
  --bar: rgba(242, 242, 247, 0.72);
  --blue: #007aff; --red: #ff3b30; --orange: #ff9500; --green: #34c759;
  --blue-text: #0040dd; --red-text: #d70015; --orange-text: #c93400; --green-text: #248a3d;
  --add-bg: rgba(52, 199, 89, 0.12); --add-ln: rgba(52, 199, 89, 0.22); --del-bg: rgba(255, 59, 48, 0.1); --del-ln: rgba(255, 59, 48, 0.2); --hunk-bg: rgba(0, 122, 255, 0.07);
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
}
@media (prefers-color-scheme: dark) {
  :root {
    --grouped: #000000; --card: #1c1c1e; --inset: #2c2c2e; --label: #f5f5f7; --secondary: rgba(235, 235, 245, 0.6); --separator: rgba(84, 84, 88, 0.55);
    --bar: rgba(22, 22, 23, 0.72);
    --blue: #0a84ff; --red: #ff453a; --orange: #ff9f0a; --green: #30d158;
    --blue-text: #409cff; --red-text: #ff6961; --orange-text: #ffb340; --green-text: #30db5b;
    --add-bg: rgba(48, 209, 88, 0.13); --add-ln: rgba(48, 209, 88, 0.24); --del-bg: rgba(255, 69, 58, 0.13); --del-ln: rgba(255, 69, 58, 0.24); --hunk-bg: rgba(10, 132, 255, 0.12);
    --shadow: none;
  }
}
@supports selector(::details-content) {
  :root { interpolate-size: allow-keywords; }
  details::details-content { block-size: 0; overflow-y: clip; transition: block-size 0.25s ease, content-visibility 0.25s allow-discrete; }
  details[open]::details-content { block-size: auto; }
}
html { scroll-behavior: smooth; scroll-padding-top: 72px; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after, ::details-content { transition: none !important; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--grouped); color: var(--label); font: 15px/1.47 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Helvetica Neue", sans-serif; -webkit-font-smoothing: antialiased; }
code, table.diff { font-family: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; }
.finding code, .hero code { padding: 1px 6px; border-radius: 6px; background: var(--inset); font-size: 12px; }
a { color: var(--blue); text-decoration: none; }
a:hover { text-decoration: underline; }
:focus-visible { outline: 3px solid color-mix(in srgb, var(--blue) 50%, transparent); outline-offset: 2px; border-radius: 6px; }
.bar { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 10px max(16px, calc((100% - 1120px) / 2 + 16px)); background: var(--bar); backdrop-filter: saturate(180%) blur(20px); -webkit-backdrop-filter: saturate(180%) blur(20px); border-bottom: 1px solid var(--separator); }
.bar-title { flex: 1; min-width: 0; font-weight: 600; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar button { border: 0; border-radius: 999px; padding: 5px 14px; font: 600 13px/1.4 -apple-system, BlinkMacSystemFont, system-ui, sans-serif; color: var(--blue-text); background: color-mix(in srgb, var(--blue) 14%, transparent); cursor: pointer; transition: background 0.2s ease, transform 0.1s ease; }
.bar button:hover { background: color-mix(in srgb, var(--blue) 22%, transparent); }
.bar button:active { transform: scale(0.96); }
main { max-width: 1120px; margin: 0 auto; padding: 32px 16px 64px; }
.hero h1 { margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.15; overflow-wrap: anywhere; }
.hero p { margin: 6px 0 28px; color: var(--secondary); }
.section-title { margin: 0 0 8px 16px; color: var(--secondary); font-size: 13px; font-weight: 400; text-transform: uppercase; letter-spacing: 0.02em; }
.badge { display: inline-block; padding: 1px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; line-height: 1.6; white-space: nowrap; }
.badge.high { color: var(--red-text); background: color-mix(in srgb, var(--red) 14%, transparent); }
.badge.medium { color: var(--orange-text); background: color-mix(in srgb, var(--orange) 16%, transparent); }
.badge.low { color: var(--blue-text); background: color-mix(in srgb, var(--blue) 14%, transparent); }
.badge.clean { color: var(--green-text); background: color-mix(in srgb, var(--green) 15%, transparent); }
.badge.kind { color: var(--secondary); background: var(--inset); font-weight: 500; }
.stack { list-style: none; margin: 0 0 36px; padding: 0; background: var(--card); border-radius: 12px; box-shadow: var(--shadow); overflow: hidden; }
.stack li + li a { border-top: 1px solid var(--separator); }
.stack li { padding-left: 16px; }
.stack a { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 12px 16px 12px 0; color: var(--label); transition: background 0.15s ease; }
.stack a:hover { text-decoration: none; }
.stack li:hover { background: color-mix(in srgb, var(--label) 4%, transparent); }
.stack a::after { content: "\\203A"; margin-left: auto; color: var(--secondary); font-size: 20px; line-height: 1; }
.stack .number { min-width: 1.4em; color: var(--secondary); font-variant-numeric: tabular-nums; }
.stack .name { min-width: 13em; font-weight: 600; }
.count, .needs { color: var(--secondary); }
summary { list-style: none; cursor: pointer; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
summary::-webkit-details-marker { display: none; }
summary::before { content: ""; flex: none; width: 7px; height: 7px; margin: 0 4px 0 2px; border-right: 2px solid var(--secondary); border-bottom: 2px solid var(--secondary); transform: rotate(-45deg); transition: transform 0.25s ease; }
details[open] > summary::before { transform: rotate(45deg); }
details.layer { margin: 0 0 20px; background: var(--card); border-radius: 12px; box-shadow: var(--shadow); overflow: hidden; }
details.layer > summary { padding: 16px 20px; }
h2 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.01em; }
.layer-body { padding: 0 20px 20px; }
.layer-meta { margin: 0 0 16px; color: var(--secondary); }
details.file { margin: 12px 0 0; background: var(--inset); border-radius: 10px; overflow: hidden; }
details.file > summary { padding: 10px 14px; overflow-wrap: anywhere; }
.file-name { font-size: 13px; font-weight: 500; }
.file-body { padding: 0 12px 12px; }
.add-count { color: var(--green-text); font-size: 13px; font-weight: 600; }
.del-count { color: var(--red-text); font-size: 13px; font-weight: 600; }
.finding { position: relative; margin: 0 0 10px; padding: 12px 16px 12px 20px; background: var(--card); border-radius: 10px; }
.finding::before { content: ""; position: absolute; inset: 10px auto 10px 8px; width: 4px; border-radius: 2px; background: var(--separator); }
.finding.high::before { background: var(--red); }
.finding.medium::before { background: var(--orange); }
.finding.low::before { background: var(--blue); }
.finding p { margin: 0 0 6px; overflow-wrap: anywhere; }
.finding-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.finding-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--secondary); font-size: 13px; }
.finding .body { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6; }
details.diff-section { background: var(--card); border-radius: 10px; overflow: hidden; }
details.diff-section > summary { padding: 8px 14px; color: var(--secondary); font-size: 13px; font-weight: 600; }
details.diff-section[open] > summary { border-bottom: 1px solid var(--separator); }
table.diff { width: 100%; border-collapse: collapse; table-layout: fixed; line-height: 1.6; }
table.diff col.ln { width: 3.8em; }
table.diff td { padding: 0 10px; vertical-align: top; }
table.diff td.ln { color: var(--secondary); text-align: right; user-select: none; font-variant-numeric: tabular-nums; opacity: 0.8; }
table.diff td.code { white-space: pre-wrap; overflow-wrap: anywhere; }
table.diff tr.meta td, table.diff tr.hunk td { color: var(--secondary); background: var(--hunk-bg); padding: 4px 14px; }
table.diff tr.add td { background: var(--add-bg); }
table.diff tr.add td.ln { background: var(--add-ln); }
table.diff tr.del td { background: var(--del-bg); }
table.diff tr.del td.ln { background: var(--del-ln); }
table.diff tr.flagged.high td:first-child { box-shadow: inset 4px 0 0 var(--red); }
table.diff tr.flagged.medium td:first-child { box-shadow: inset 4px 0 0 var(--orange); }
table.diff tr.flagged.low td:first-child { box-shadow: inset 4px 0 0 var(--blue); }
table.diff tr:target td { background: color-mix(in srgb, var(--blue) 18%, transparent); }
@media (max-width: 640px) {
  .hero h1 { font-size: 28px; }
  .stack .name { min-width: 0; }
  .layer-body { padding: 0 12px 12px; }
  .file-body { padding: 0 8px 8px; }
}
</style>
</head>
<body>
<header class="bar">
<span class="bar-title">${escapeHtml(title)}</span>
<button type="button" data-toggle-all="open">Expand all</button>
<button type="button" data-toggle-all="close">Collapse all</button>
</header>
<main>
<div class="hero">
<h1>${escapeHtml(title)}</h1>
<p>${subtitle}</p>
</div>
<h2 class="section-title">Layers</h2>
<ol class="stack">
${stack.layers.map(renderOverviewRow).join("\n")}
</ol>
${stack.layers.map(renderLayer).join("\n")}
</main>
<script>
for (const button of document.querySelectorAll("[data-toggle-all]")) {
  button.addEventListener("click", () => {
    for (const details of document.querySelectorAll("main details")) details.open = button.dataset.toggleAll === "open";
  });
}
document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  const target = link && document.getElementById(decodeURIComponent(link.hash.slice(1)));
  for (let node = target?.parentElement; node; node = node.parentElement) {
    if (node.tagName === "DETAILS") node.open = true;
  }
});
</script>
</body>
</html>
`;
}
