/**
 * reporting/index.ts — ReportGenerator: orchestrates report formatting.
 *
 * Combines the summary and detail formatters with storage management
 * to produce and persist scan reports.
 */
import { formatSummary } from './summary';
import { formatDetail } from './detail';
/**
 * ReportGenerator orchestrates the creation, formatting, and storage of scan reports.
 */
export class ReportGenerator {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Generate and store a complete report.
     *
     * @param report - The complete run report
     * @param delta - The delta result for messaging
     * @param staleExclusions - Whether stale exclusions exist
     * @returns An object with summary and detail text
     */
    generate(report, delta, staleExclusions) {
        const summary = formatSummary(report, delta, staleExclusions);
        const detail = formatDetail(report, delta);
        this.storage.writeRun(report, detail);
        return { summary, detail };
    }
}
//# sourceMappingURL=index.js.map