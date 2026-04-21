/**
 * reporting/index.ts — ReportGenerator: orchestrates report formatting.
 *
 * Combines the summary and detail formatters with storage management
 * to produce and persist scan reports.
 */
import type { RunReport, DeltaResult } from '../types';
import type { StorageManager } from './storage';
/**
 * ReportGenerator orchestrates the creation, formatting, and storage of scan reports.
 */
export declare class ReportGenerator {
    private readonly storage;
    constructor(storage: StorageManager);
    /**
     * Generate and store a complete report.
     *
     * @param report - The complete run report
     * @param delta - The delta result for messaging
     * @param staleExclusions - Whether stale exclusions exist
     * @returns An object with summary and detail text
     */
    generate(report: RunReport, delta: DeltaResult, staleExclusions: boolean): {
        summary: string;
        detail: string;
    };
}
//# sourceMappingURL=index.d.ts.map