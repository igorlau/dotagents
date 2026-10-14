import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Agent, Mode } from "./targets.ts";
import { configDir } from "./paths.ts";

export interface Entry {
  path: string;
  kind: "file" | "block";
  // SHA-256 of what dotagents wrote: the whole file, or the block body.
  hash: string;
  // For blocks: whether dotagents created the file, so uninstall can delete it.
  created?: boolean;
}

export interface Manifest {
  schema: 1;
  version: string;
  mode: Mode;
  agents: Agent[];
  skills: string[];
  entries: Entry[];
  updatedAt: string;
}

export const PROJECT_MANIFEST = ".dotagents.json";

export function hash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function globalManifestPath(): string {
  return path.join(configDir(), "manifest.json");
}

export function projectManifestPath(root: string): string {
  return path.join(root, PROJECT_MANIFEST);
}

export function readManifest(file: string): Manifest | undefined {
  if (!fs.existsSync(file)) return undefined;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Manifest;
}

export function writeManifest(file: string, manifest: Manifest): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\n");
}

// Project manifests store paths relative to the repository root so that they
// stay valid in other clones. Global manifests store absolute paths.
export function toStored(entries: Entry[], root: string | undefined): Entry[] {
  if (!root) return entries;
  return entries.map((entry) => ({ ...entry, path: path.relative(root, entry.path).split(path.sep).join("/") }));
}

export function fromStored(entries: Entry[], root: string | undefined): Entry[] {
  if (!root) return entries;
  return entries.map((entry) => ({ ...entry, path: path.join(root, ...entry.path.split("/")) }));
}
