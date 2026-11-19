import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { parseArgs } from "node:util";

const USAGE = `Usage:
  node review-loop.mjs scope <old-tree> <new-tree>
  node review-loop.mjs apply --ledger <file> --review <file> --round <n> [--old <tree> --new <tree>]
  node review-loop.mjs history --ledger <file> --old <tree> --new <tree>
  node review-loop.mjs accept --ledger <file>`;
const CLASSES = ["requirement-gap", "nn-breach", "logic", "edge-case", "error-handling", "concurrency", "type-safety", "api-contract", "performance", "security", "test-gap", "duplication", "naming", "complexity", "dead-code", "comment", "docs-accuracy", "docs-style", "accessibility", "ux", "visual"];
const SEVERITIES = ["high", "medium", "low"];
const STATUSES = ["fixed", "open", "regressed"];
const UX_FILE = /\.(tsx|jsx|vue|svelte|html|css)$/;
const MD_FILE = /\.md$/;
const LAST_FIX_ROUND = 3;
const MAX_DIFF = 64 * 1024 * 1024;

const { positionals, values } = readArgs();
const [command, ...rest] = positionals;
if (command === "scope" && rest.length === 2) print(scope(rest[0], rest[1]));
else if (command === "apply" && rest.length === 0) print(apply(values));
else if (command === "history" && rest.length === 0 && values.ledger && values.old && values.new) print(history(values));
else if (command === "accept" && rest.length === 0 && values.ledger) print(accept(values.ledger));
else usage(USAGE);

function scope(oldId, newId) {
  const [oldTree, newTree] = [oldId, newId].map((id) => git(["rev-parse", "--verify", "--end-of-options", `${id}^{tree}`]).trim());
  const entries = git(["diff", "--name-status", "-z", "--no-renames", oldTree, newTree]).split("\0").filter(Boolean);
  const files = [];
  const changedLines = {};
  let lines = 0;
  for (let i = 0; i < entries.length; i += 2) {
    const [status, file] = [entries[i], entries[i + 1]];
    files.push(file);
    const ranges = [];
    const diff = git(["--literal-pathspecs", "diff", "-U0", "--no-color", "--no-ext-diff", "--no-renames", oldTree, newTree, "--", file]);
    for (const [, oldCount = "1", start, newCount = "1"] of diff.matchAll(/^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)) {
      lines += Number(oldCount) + Number(newCount);
      const first = Number(start);
      ranges.push(newCount === "0" ? [first + 1, first + 1] : [first, first + Number(newCount) - 1]);
    }
    if (status !== "D") changedLines[file] = ranges;
  }
  const lenses = files.length === 0 ? [] : ["requirements", "code"];
  if (files.some((file) => !MD_FILE.test(file))) lenses.push("security");
  if (files.some((file) => UX_FILE.test(file))) lenses.push("ux");
  if (files.some((file) => MD_FILE.test(file))) lenses.push("docs");
  return { files, lines, changedLines, lenses, ui: lenses.includes("ux") };
}

function apply({ ledger: ledgerFile, review: reviewFile, round: roundText, old: oldTree, new: newTree }) {
  const round = Number(roundText);
  if (!ledgerFile || !reviewFile || !Number.isInteger(round) || round < 0) usage(USAGE);
  if (round > 0 && !(oldTree && newTree)) usage("A delta review (round 1 or later) needs --old and --new.");
  const review = readReview(reviewFile);
  const ledger = round === 0 ? { entries: [], rounds: [] } : readJson(ledgerFile);
  const changedLines = round === 0 ? undefined : scope(oldTree, newTree).changedLines;

  const escalations = [];
  for (const { id, status } of review.previous ?? []) {
    const entry = ledger.entries.find((candidate) => candidate.id === id);
    if (!entry || !STATUSES.includes(status)) continue;
    if (entry.status === "fixed" && status === "regressed") escalations.push(`${id} regressed after a fix closed it`);
    entry.status = status;
  }

  const earlier = [...ledger.entries];
  for (const finding of review.findings) {
    if (changedLines && !onLines(changedLines, finding)) continue;
    const fine = `${finding.file}:${finding.line}:${finding.class}`;
    const coarse = `${finding.file}:${finding.class}`;
    if (earlier.some((entry) => entry.fine === fine && isOpen(entry))) continue;
    const id = `F${ledger.entries.length + 1}`;
    ledger.entries.push({ id, ...finding, fine, coarse, round, status: "open" });
    const fixedTwin = earlier.find((entry) => entry.fine === fine && entry.status === "fixed");
    const coarseTwin = earlier.find((entry) => entry.coarse === coarse);
    if (fixedTwin) escalations.push(`${id} has the key ${fine} of ${fixedTwin.id}, which a fix closed`);
    else if (coarseTwin && finding.class !== "docs-style") escalations.push(`${id} has the key ${coarse} of ${coarseTwin.id}, on a line that the fix changed`);
  }

  const open = ledger.entries.filter(isOpen);
  const before = ledger.rounds.at(-1)?.open;
  ledger.rounds.push({ round, open: open.length });
  fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);

  const result = (action, reason) => ({ action, reason, findings: open });
  if (open.length === 0) return result("done", "no open findings");
  if (round >= LAST_FIX_ROUND) return result("escalate", "cap");
  if (escalations.length > 0) return result("escalate", escalations.join("; "));
  if (before !== undefined && open.length >= before) return result("escalate", `the open count ${open.length} is not lower than ${before}`);
  return result("fix", `${open.length} open findings`);
}

function history({ ledger: ledgerFile, old: oldTree, new: newTree }) {
  const { changedLines } = scope(oldTree, newTree);
  return { history: readJson(ledgerFile).entries.filter((entry) => onLines(changedLines, entry)) };
}

function accept(ledgerFile) {
  const ledger = readJson(ledgerFile);
  const accepted = ledger.entries.filter(isOpen);
  for (const entry of accepted) entry.status = "accepted";
  fs.writeFileSync(ledgerFile, `${JSON.stringify(ledger, null, 2)}\n`);
  return { accepted };
}

function isOpen(entry) {
  return entry.status === "open" || entry.status === "regressed";
}

function onLines(changedLines, { file, line }) {
  return (changedLines[file] ?? []).some(([start, end]) => line >= start && line <= end);
}

function readReview(file) {
  const review = readJson(file);
  const valid =
    Array.isArray(review.findings) &&
    review.findings.every((finding) => typeof finding.file === "string" && Number.isInteger(finding.line) && finding.line >= 1 && CLASSES.includes(finding.class) && SEVERITIES.includes(finding.severity)) &&
    (review.previous === undefined || Array.isArray(review.previous));
  if (!valid) fail(`${file} does not match the reviewer output schema`);
  return review;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`Cannot read ${file}: ${error.message}`);
  }
}

function readArgs() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: { ledger: { type: "string" }, review: { type: "string" }, round: { type: "string" }, old: { type: "string" }, new: { type: "string" } },
    });
  } catch (error) {
    usage(`${error.message}\n${USAGE}`);
  }
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: MAX_DIFF });
  if (result.status !== 0) fail(`git ${args.join(" ")} failed: ${(result.stderr || result.error?.message || "").trim()}`);
  return result.stdout;
}

function print(value) {
  console.log(JSON.stringify(value, null, 2));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function usage(message) {
  console.error(message);
  process.exit(2);
}
