import * as fs from 'fs';
import * as path from 'path';
import { DRIFT_EXCLUDED_BY_DEFAULT } from "./inventory.js"; // eslint-disable-line import/extensions
const BASELINES_DIR = "clawvitals/baselines";
const BASELINE_FILE = "cognitive-files.json";
function getBaselinePath(workspaceDir) {
    return path.join(workspaceDir, BASELINES_DIR, BASELINE_FILE);
}
export function loadBaseline(workspaceDir) {
    const filePath = getBaselinePath(workspaceDir);
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    catch {
        return null;
    }
}
export function saveBaseline(workspaceDir, baseline) {
    const filePath = getBaselinePath(workspaceDir);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(baseline, null, 2), { mode: 0o600 });
}
export function detectDrift(current, baseline) {
    const baselineMap = new Map(baseline.files.map(f => [f.name, f.sha256]));
    const currentMap = new Map(current.files.map(f => [f.name, f.sha256]));
    const changed = [];
    const unchanged = [];
    const added = [];
    const removed = [];
    for (const [name, sha256] of currentMap) {
        if (!baselineMap.has(name)) {
            added.push(name);
        }
        else if (baselineMap.get(name) !== sha256) {
            changed.push(name);
        }
        else {
            unchanged.push(name);
        }
    }
    for (const name of baselineMap.keys()) {
        if (!currentMap.has(name))
            removed.push(name);
    }
    return { has_drift: changed.length > 0 || added.length > 0 || removed.length > 0, changed, added, removed, unchanged };
}
export function approveFile(workspaceDir, filename, inventory, approvedBy) {
    const existing = loadBaseline(workspaceDir);
    const now = new Date().toISOString();
    const fileEntry = inventory.files.find(f => f.name === filename);
    if (!fileEntry)
        throw new Error(`File not found in inventory: ${filename}`);
    const newEntry = { name: filename, sha256: fileEntry.sha256, size: fileEntry.size, approved_at: now, approved_by: approvedBy };
    const baseline = existing
        ? { ...existing, files: [...existing.files.filter(f => f.name !== filename), newEntry], last_checked_at: now }
        : { files: [newEntry], created_at: now, last_checked_at: now };
    saveBaseline(workspaceDir, baseline);
}
/**
 * Compute per-file cognitive status for display in clawvitals_status.
 * Shows all files in inventory with their monitored/excluded state and drift status.
 */
export function getCognitiveFileStatuses(workspaceDir, inventory, baseline) {
    const baselineMap = new Map(baseline?.files.map(f => [f.name, f]) ?? []);
    const statuses = [];
    for (const file of inventory.files) {
        const baselineEntry = baselineMap.get(file.name);
        const excluded = baselineEntry?.excluded === true || DRIFT_EXCLUDED_BY_DEFAULT.has(file.name);
        const monitored = !excluded;
        let drift_state;
        if (!monitored) {
            drift_state = 'excluded';
        }
        else if (!baselineEntry) {
            drift_state = 'not_baselined';
        }
        else if (baselineEntry.sha256 !== file.sha256) {
            drift_state = 'drifted';
        }
        else {
            drift_state = 'clean';
        }
        statuses.push({
            name: file.name,
            monitored,
            drift_state,
            sha256: file.sha256.slice(0, 12),
            approved_at: baselineEntry?.approved_at,
        });
    }
    return statuses;
}
//# sourceMappingURL=drift.js.map