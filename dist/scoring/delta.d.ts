/**
 * scoring/delta.ts — DeltaDetector: new/resolved/new-check distinction.
 *
 * Compares current scan results against a previous run to detect:
 * - New findings: controls that are now FAIL but weren't before
 * - Resolved findings: controls that were FAIL but are now PASS
 * - New checks: controls introduced in a newer library version
 */
import type { RunReport, DeltaResult } from '../types';
/**
 * DeltaDetector computes changes between consecutive scan runs.
 *
 * On first run (previous === null), all current FAILs are treated
 * as new findings since there's no baseline to compare against.
 */
export declare class DeltaDetector {
    /**
     * Detect changes between current and previous scan results.
     *
     * @param current - The current scan's run report
     * @param previous - The previous scan's run report (null on first run)
     * @returns Delta result with new findings, resolved findings, and new checks
     */
    detect(current: RunReport, previous: RunReport | null): DeltaResult;
    /**
     * Compare two semver strings (a > b).
     * Splits on '.', compares each numeric component left-to-right.
     * Strips pre-release suffixes (e.g. "1.2.3-rc1" → 1.2.3) before comparing.
     */
    private semverGreaterThan;
}
//# sourceMappingURL=delta.d.ts.map