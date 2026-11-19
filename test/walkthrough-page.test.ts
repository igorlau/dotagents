import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { git, sandbox, write, type Sandbox } from "./helpers.ts";

const SCRIPT = fileURLToPath(new URL("../skills/dot-walkthrough-branch/scripts/page.mjs", import.meta.url));
const ODD_FILE = "src/<b>.txt";

const validStack = () => ({
  base: "main",
  head: "feat/x",
  layers: [
    { dependsOn: [], files: ["src/shared.ts"], findings: [], name: "Contracts <i>", purpose: "Define the shape" },
    {
      dependsOn: [1],
      files: ["src/a.ts", "src/shared.ts"],
      findings: [
        {
          body: "Body with <script>bad()</script>\n**Fix:** Use `<b>` here.",
          file: "src/a.ts",
          kind: "correctness",
          line: 1,
          severity: "high",
          summary: "Value <img src=x> changed",
        },
      ],
      name: "Logic",
      purpose: "Use the shape",
    },
    { dependsOn: [1, 2], files: [ODD_FILE], findings: [], name: "Escapes", purpose: "Hold odd names" },
  ],
});

let box: Sandbox;
let repo: string;
let pagePath: string;
let page: string;

function commit(dir: string, message: string) {
  git(dir, ["add", "-A"]);
  git(dir, ["-c", "user.name=test", "-c", "user.email=test@example.com", "commit", "-q", "-m", message]);
}

function makeRepoWithMainAheadOfFork(): string {
  const dir = box.repo({ "src/a.ts": "export const a = 1;\n", "src/same.ts": "same\n", "src/shared.ts": "one\n" });
  git(dir, ["checkout", "-q", "-b", "feat/x"]);
  write(path.join(dir, "src/a.ts"), "export const a = 2;\n");
  write(path.join(dir, "src/shared.ts"), "one\nshared added line\n");
  write(path.join(dir, ODD_FILE), "<script>alert(1)</script>\n");
  commit(dir, "feature");
  git(dir, ["checkout", "-q", "main"]);
  write(path.join(dir, "src/shared.ts"), "one\nmain-only line\n");
  commit(dir, "main after the fork");
  git(dir, ["checkout", "-q", "feat/x"]);
  return dir;
}

const tmpDirOf = () => path.join(box.home, "tmp");

function runScript(stack: unknown, raw?: string, cwd = repo) {
  const layersFile = path.join(box.home, "layers.json");
  write(layersFile, raw ?? JSON.stringify(stack));
  const tmpDir = tmpDirOf();
  fs.mkdirSync(tmpDir, { recursive: true });
  const env = { PATH: process.env.PATH, HOME: box.home, TMPDIR: tmpDir, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  return spawnSync(process.execPath, [SCRIPT, layersFile], { cwd, env, encoding: "utf8" });
}

function decode(html: string): string {
  return html.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

const layerSections = () => page.split('<details class="layer"').slice(1);

function fileBlock(layerIndex: number, file: string): string {
  const block = layerSections()[layerIndex]
    .split('<details class="file"')
    .slice(1)
    .find((candidate) => decode(candidate.slice(0, candidate.indexOf("</summary>"))).includes(file));
  assert.ok(block, `layer ${layerIndex + 1} has no block for ${file}`);
  return block;
}

const diffOf = (block: string) => block.slice(block.indexOf('<table class="diff">'), block.indexOf("</table>"));
const row = (kind: string, text: string) => new RegExp(`<tr class="${kind}[^"]*"[^>]*>.*<td class="code">${text}</td></tr>`);

before(() => {
  box = sandbox();
  repo = makeRepoWithMainAheadOfFork();
  const result = runScript(validStack());
  assert.equal(result.status, 0, result.stderr);
  pagePath = result.stdout.trim();
  page = fs.readFileSync(pagePath, "utf8");
});
after(() => box?.cleanup());

test("the walkthrough page shows each layer with its purpose, dependencies, and files in layer order", () => {
  const sections = layerSections();
  const overview = page.slice(page.indexOf('<ol class="stack">'), page.indexOf("</ol>"));

  assert.equal(sections.length, 3);
  assert.deepEqual(sections.map((section) => section.match(/id="layer-(\d+)"/)?.[1]), ["1", "2", "3"]);
  assert.deepEqual([...overview.matchAll(/href="#layer-(\d+)"/g)].map((match) => match[1]), ["1", "2", "3"]);
  assert.match(sections[0], /Purpose: Define the shape/);
  assert.match(sections[0], /Depends on: nothing/);
  assert.match(sections[1], /Purpose: Use the shape/);
  assert.match(sections[1], /Depends on: layer 1\b/);
  assert.match(sections[2], /Purpose: Hold odd names/);
  assert.match(sections[2], /Depends on: layers 1, 2/);
  fileBlock(0, "src/shared.ts");
  fileBlock(1, "src/a.ts");
  fileBlock(1, "src/shared.ts");
  fileBlock(2, ODD_FILE);
});

test("the walkthrough page embeds the diff of each file from the merge base", () => {
  const diff = diffOf(fileBlock(1, "src/a.ts"));

  assert.match(diff, row("del", "-export const a = 1;"));
  assert.match(diff, row("add", "\\+export const a = 2;"));
  assert.match(diffOf(fileBlock(0, "src/shared.ts")), row("add", "\\+shared added line"));
  assert.doesNotMatch(page, /main-only line/);
});

test("the walkthrough page shows each finding next to its file", () => {
  const block = fileBlock(1, "src/a.ts");
  const finding = decode(block.slice(block.indexOf('<div class="finding'), block.indexOf('<table class="diff">')));

  assert.match(block, /class="finding high"/);
  assert.match(finding, /high/);
  assert.match(finding, /Value <img src=x> changed/);
  assert.match(finding, /src\/a\.ts:1/);
  assert.match(finding, /correctness/);
  assert.doesNotMatch(fileBlock(1, "src/shared.ts"), /class="finding/);
  assert.doesNotMatch(fileBlock(0, "src/shared.ts"), /class="finding/);
});

test("the walkthrough page numbers the diff lines, hides the Git header lines, and marks the line of each finding", () => {
  const diff = diffOf(fileBlock(1, "src/a.ts"));

  assert.match(diff, /<tr class="del"><td class="ln">1<\/td><td class="ln"><\/td>/);
  assert.match(diff, /<tr class="add flagged high" id="layer-2-file-1-line-1"><td class="ln"><\/td><td class="ln">1<\/td>/);
  assert.match(fileBlock(1, "src/a.ts"), /<a href="#layer-2-file-1-line-1"><code>src\/a\.ts:1<\/code><\/a>/);
  assert.doesNotMatch(diff, /diff --git|index [0-9a-f]|--- a\/|\+\+\+ b\//);
});

test("the walkthrough page opens each file and closes its diff, and keeps the findings outside the diff", () => {
  const block = fileBlock(1, "src/a.ts");
  const diffSection = block.slice(block.indexOf('<details class="diff-section">'));

  assert.match(block, /^ open>/);
  assert.match(diffSection, /^<details class="diff-section">\n<summary>Diff<\/summary>\n<table class="diff">/);
  assert.ok(block.indexOf('<div class="finding') < block.indexOf('<details class="diff-section">'));
  assert.match(page, /<button type="button" data-toggle-all="open">Expand all<\/button>/);
  assert.match(page, /<button type="button" data-toggle-all="close">Collapse all<\/button>/);
});

test("the walkthrough page renders bold and code spans in a finding body, and escapes the text in them", () => {
  const block = fileBlock(1, "src/a.ts");

  assert.match(block, /<strong>Fix:<\/strong> Use <code>&#60;b&#62;<\/code> here\./);
});

test("the walkthrough page shows the full diff of a file that two layers share in both layers", () => {
  const first = diffOf(fileBlock(0, "src/shared.ts"));
  const second = diffOf(fileBlock(1, "src/shared.ts"));

  assert.match(first, /\+shared added line/);
  assert.equal(second, first);
});

test("the walkthrough page escapes HTML in diff lines and findings", () => {
  const text = decode(page);

  for (const raw of ["<script>alert", "<script>bad", "<img", "<b>", "<i>"]) assert.ok(!page.includes(raw), `the page has a raw ${raw}`);
  assert.ok(text.includes("+<script>alert(1)</script>"));
  assert.ok(text.includes(ODD_FILE));
  assert.ok(text.includes("Contracts <i>"));
  assert.ok(text.includes("Value <img src=x> changed"));
  assert.ok(text.includes("Body with <script>bad()</script>"));
});

test("the walkthrough page loads no network resources", () => {
  assert.doesNotMatch(page, /\b(?:src|href)\s*=\s*["']?\s*(?:https?:)?\/\//i);
  assert.doesNotMatch(page, /url\(\s*["']?\s*(?:https?:)?\/\//i);
  assert.doesNotMatch(page, /@import/i);
});

test("the walkthrough page script exits with an error when the layers file is invalid", async (t) => {
  const withFinding = (change: Record<string, unknown>) => {
    const stack = validStack();
    Object.assign(stack.layers[1].findings[0], change);
    return stack;
  };
  const forward = validStack();
  forward.layers[0].dependsOn = [2];
  const unchanged = validStack();
  unchanged.layers[0].files.push("src/same.ts");
  const cases = [
    { field: "layers[1].findings[0].severity", label: "a bad severity", stack: withFinding({ severity: "critical" }) },
    { field: "layers[1].findings[0].file", label: "a finding file outside its layer", stack: withFinding({ file: ODD_FILE }) },
    { field: "layers[0].dependsOn", label: "a forward dependsOn", stack: forward },
    { field: "head", label: "a head that starts with -", stack: { ...validStack(), head: "--output=x" } },
    { field: "layers[0].files[1]", label: "a file with no changes in the target", stack: unchanged },
    { field: "base and head", label: "a base without a head", stack: { base: "main", layers: validStack().layers } },
    { field: "oldTree and newTree", label: "an oldTree without a newTree", stack: { layers: validStack().layers, oldTree: "abcd" } },
    { field: "oldTree and newTree", label: "a newTree without an oldTree", stack: { layers: validStack().layers, newTree: "abcd" } },
    { field: "oldTree", label: "a tree id that is not hexadecimal", stack: { layers: validStack().layers, newTree: "abcd", oldTree: "xyz1" } },
    { field: "newTree", label: "a tree id in uppercase", stack: { layers: validStack().layers, newTree: "ABCD1234", oldTree: "abcd" } },
    { field: "base cannot go with oldTree", label: "a base mixed with a tree range", stack: { ...validStack(), newTree: "abcd", oldTree: "abcd" } },
    { field: undefined, label: "bad JSON", raw: "{ not json" },
  ];

  for (const { field, label, raw, stack } of cases) {
    await t.test(label, () => {
      const result = runScript(stack, raw);

      assert.notEqual(result.status, 0);
      assert.notEqual(result.stderr.trim(), "");
      if (field) assert.ok(result.stderr.includes(field), result.stderr);
      assert.deepEqual(fs.readdirSync(path.dirname(pagePath)), [path.basename(pagePath)]);
    });
  }
});

test("the walkthrough page script writes the page at the repository root and prints its path", () => {
  assert.equal(pagePath, path.join(fs.realpathSync(repo), ".tmp", "walkthrough", "feat-x.html"));
  assert.ok(fs.existsSync(pagePath));
});

test("the walkthrough page script writes the full diffs when it runs from a subdirectory of the repository", () => {
  const result = runScript(validStack(), undefined, path.join(repo, "src"));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), pagePath);
  assert.equal(fs.readFileSync(pagePath, "utf8"), page);
});

test("the walkthrough page script writes a page for a working-tree target without a base branch", () => {
  const dirty = box.repo({ "src/a.ts": "export const a = 1;\n", "src/gone.ts": "gone\n" });
  write(path.join(dirty, "src/a.ts"), "export const a = 2;\n");
  write(path.join(dirty, "src/new.ts"), "export const created = true;\n");
  fs.rmSync(path.join(dirty, "src/gone.ts"));
  const layers = [{ dependsOn: [], files: ["src/a.ts", "src/new.ts", "src/gone.ts"], findings: [], name: "Changes", purpose: "Hold the edits" }];

  const result = runScript({ layers }, undefined, dirty);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), path.join(fs.realpathSync(dirty), ".tmp", "walkthrough", "working-tree.html"));
  const workingPage = fs.readFileSync(result.stdout.trim(), "utf8");
  assert.match(workingPage, /<h1>working tree<\/h1>/);
  assert.match(workingPage, /<title>working tree<\/title>/);
  assert.match(workingPage, row("add", "\\+export const a = 2;"));
  assert.match(workingPage, row("add", "\\+export const created = true;"));
  assert.match(workingPage, row("del", "-gone"));
  assert.match(git(dirty, ["status", "--porcelain"]), /\?\? src\/new\.ts/);
  assert.deepEqual(fs.readdirSync(tmpDirOf()), []);
});

test("the walkthrough page script removes its temporary index directory when a working-tree run fails", () => {
  const empty = path.join(box.home, "empty-repo");
  fs.mkdirSync(empty);
  git(empty, ["init", "-q", "-b", "main"]);
  write(path.join(empty, "src/a.ts"), "export const a = 1;\n");
  const layers = [{ dependsOn: [], files: ["src/a.ts"], findings: [], name: "Changes", purpose: "Hold the edits" }];

  const result = runScript({ layers }, undefined, empty);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /read-tree/);
  assert.deepEqual(fs.readdirSync(tmpDirOf()), []);
});

test("the walkthrough page script does not write through a symbolic link at the page path", () => {
  const dir = box.repo({ "src/a.ts": "export const a = 1;\n" });
  write(path.join(dir, "src/a.ts"), "export const a = 2;\n");
  const victim = path.join(box.home, "victim.txt");
  write(victim, "keep\n");
  fs.mkdirSync(path.join(dir, ".tmp", "walkthrough"), { recursive: true });
  fs.symlinkSync(victim, path.join(dir, ".tmp", "walkthrough", "working-tree.html"));
  const layers = [{ dependsOn: [], files: ["src/a.ts"], findings: [], name: "Changes", purpose: "Hold the edits" }];

  const result = runScript({ layers }, undefined, dir);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(victim, "utf8"), "keep\n");
  assert.match(fs.readFileSync(result.stdout.trim(), "utf8"), /<h1>working tree<\/h1>/);
});

function makeRepoWithTwoTrees() {
  const dir = box.repo({ "src/a.ts": "export const a = 1;\n", "src/same.ts": "same\n" });
  const oldTree = git(dir, ["rev-parse", "HEAD^{tree}"]);
  write(path.join(dir, "src/a.ts"), "export const a = 2;\n");
  commit(dir, "change a");
  return { dir, newTree: git(dir, ["rev-parse", "HEAD^{tree}"]), oldTree };
}

test("the walkthrough page script writes a page for a tree range, and accepts an abbreviated tree id", () => {
  const { dir, newTree, oldTree } = makeRepoWithTwoTrees();
  const layers = [{ dependsOn: [], files: ["src/a.ts"], findings: [], name: "Changes", purpose: "Hold the edits" }];
  const range = `${oldTree.slice(0, 12)}..${newTree.slice(0, 12)}`;

  const result = runScript({ layers, newTree, oldTree: oldTree.slice(0, 8) }, undefined, dir);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), path.join(fs.realpathSync(dir), ".tmp", "walkthrough", `tree-${range}.html`));
  const treePage = fs.readFileSync(result.stdout.trim(), "utf8");
  assert.match(treePage, new RegExp(`<h1>${range}</h1>`));
  assert.match(treePage, /Tree range/);
  assert.match(treePage, row("del", "-export const a = 1;"));
  assert.match(treePage, row("add", "\\+export const a = 2;"));
});

test("the walkthrough page script exits with an error when a tree range has an unknown tree or an unchanged file", async (t) => {
  const { dir, newTree, oldTree } = makeRepoWithTwoTrees();
  const layerOf = (file: string) => [{ dependsOn: [], files: [file], findings: [], name: "Changes", purpose: "Hold the edits" }];

  await t.test("an unknown tree id", () => {
    const result = runScript({ layers: layerOf("src/a.ts"), newTree, oldTree: "0123456789abcdef" }, undefined, dir);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /rev-parse/);
  });

  await t.test("a file with no changes in the tree range", () => {
    const result = runScript({ layers: layerOf("src/same.ts"), newTree, oldTree }, undefined, dir);

    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes("layers[0].files[0] has no changes in the target"), result.stderr);
  });
});
