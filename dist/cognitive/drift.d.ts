import type { CognitiveInventory } from "./inventory.js";
export interface BaselineEntry {
    name: string;
    sha256: string;
    size: number;
    approved_at: string;
    approved_by: string;
    excluded?: boolean;
}
export interface CognitiveBaseline {
    files: BaselineEntry[];
    created_at: string;
    last_checked_at: string;
}
export interface DriftResult {
    has_drift: boolean;
    changed: string[];
    added: string[];
    removed: string[];
    unchanged: string[];
}
export interface CognitiveFileStatus {
    name: string;
    monitored: boolean;
    drift_state: 'clean' | 'drifted' | 'new' | 'removed' | 'not_baselined' | 'excluded';
    sha256?: string;
    approved_at?: string;
}
export declare function loadBaseline(workspaceDir: string): CognitiveBaseline | null;
export declare function saveBaseline(workspaceDir: string, baseline: CognitiveBaseline): void;
export declare function detectDrift(current: CognitiveInventory, baseline: CognitiveBaseline): DriftResult;
export declare function approveFile(workspaceDir: string, filename: string, inventory: CognitiveInventory, approvedBy: string): void;
/**
 * Compute per-file cognitive status for display in clawvitals_status.
 * Shows all files in inventory with their monitored/excluded state and drift status.
 */
export declare function getCognitiveFileStatuses(workspaceDir: string, inventory: CognitiveInventory, baseline: CognitiveBaseline | null): CognitiveFileStatus[];
//# sourceMappingURL=drift.d.ts.map