/**
 * cognitive/config-drift.ts — Field-level configuration drift detection.
 *
 * Compares tracked fields between two CollectorResult snapshots to surface
 * exactly what changed between scans.
 */
import type { CollectorResult } from "../types.js";
export interface ConfigFieldChange {
    field: string;
    previous: unknown;
    current: unknown;
    change_type: "added" | "removed" | "changed";
}
export interface ConfigDriftResult {
    changes: ConfigFieldChange[];
    has_drift: boolean;
}
export declare function detectConfigDrift(current: CollectorResult, previous: CollectorResult): ConfigDriftResult;
//# sourceMappingURL=config-drift.d.ts.map