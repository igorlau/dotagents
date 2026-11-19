import assert from "node:assert/strict";
import path from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { readManifest } from "../src/manifest.ts";
import { sandbox, write, type Sandbox } from "./helpers.ts";

let box: Sandbox;
beforeEach(() => (box = sandbox()));
afterEach(() => box.cleanup());

test("readManifest drops agents that dotagents does not support", () => {
  const file = path.join(box.home, "manifest.json");
  write(file, JSON.stringify({ agents: ["claude", "codex", "copilot"], entries: [], mode: "global", schema: 1, skills: [], updatedAt: "", version: "0" }));

  const manifest = readManifest(file);

  assert.deepEqual(manifest?.agents, ["claude", "copilot"]);
});

test("readManifest reports the stored agents that dotagents does not list as removed", () => {
  const file = path.join(box.home, "manifest.json");
  write(file, JSON.stringify({ agents: ["claude", "codex"] }));

  assert.deepEqual(readManifest(file)?.removedAgents, ["codex"]);
});

test("readManifest reports no removed agents when every agent is supported", () => {
  const file = path.join(box.home, "manifest.json");
  write(file, JSON.stringify({ agents: ["claude", "copilot"] }));

  assert.deepEqual(readManifest(file)?.removedAgents, []);
});
