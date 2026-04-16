import * as fs from "node:fs";
import * as path from "node:path";
import type { CognitiveInventory } from "./inventory.js";

export interface BaselineEntry { name: string; sha256: string; size: number; approved_at: string; approved_by: string; }
export interface CognitiveBaseline { files: BaselineEntry[]; created_at: string; last_checked_at: string; }
export interface DriftResult { has_drift: boolean; changed: string[]; added: string[]; removed: string[]; unchanged: string[]; }

const BASELINES_DIR = "clawvitals/baselines";
const BASELINE_FILE = "cognitive-files.json";

function getBaselinePath(workspaceDir: string): string {
  return path.join(workspaceDir, BASELINES_DIR, BASELINE_FILE);
}

export function loadBaseline(workspaceDir: string): CognitiveBaseline | null {
  const filePath = getBaselinePath(workspaceDir);
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as CognitiveBaseline;
  } catch { return null; }
}

export function saveBaseline(workspaceDir: string, baseline: CognitiveBaseline): void {
  const filePath = getBaselinePath(workspaceDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(baseline, null, 2), { mode: 0o600 });
}

export function detectDrift(current: CognitiveInventory, baseline: CognitiveBaseline): DriftResult {
  const baselineMap = new Map(baseline.files.map(f => [f.name, f.sha256]));
  const currentMap = new Map(current.files.map(f => [f.name, f.sha256]));

  const changed: string[] = [];
  const unchanged: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const [name, sha256] of currentMap) {
    if (!baselineMap.has(name)) { added.push(name); }
    else if (baselineMap.get(name) !== sha256) { changed.push(name); }
    else { unchanged.push(name); }
  }
  for (const name of baselineMap.keys()) {
    if (!currentMap.has(name)) removed.push(name);
  }
  return { has_drift: changed.length > 0 || added.length > 0 || removed.length > 0, changed, added, removed, unchanged };
}

export function approveFile(workspaceDir: string, filename: string, inventory: CognitiveInventory, approvedBy: string): void {
  const existing = loadBaseline(workspaceDir);
  const now = new Date().toISOString();
  const fileEntry = inventory.files.find(f => f.name === filename);
  if (!fileEntry) throw new Error(`File not found in inventory: ${filename}`);

  const newEntry: BaselineEntry = { name: filename, sha256: fileEntry.sha256, size: fileEntry.size, approved_at: now, approved_by: approvedBy };

  const baseline: CognitiveBaseline = existing
    ? { ...existing, files: [...existing.files.filter(f => f.name !== filename), newEntry], last_checked_at: now }
    : { files: [newEntry], created_at: now, last_checked_at: now };

  saveBaseline(workspaceDir, baseline);
}
