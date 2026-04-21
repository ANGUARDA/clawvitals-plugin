/**
 * reporting/detail.ts — Full detail report formatter.
 *
 * Produces a comprehensive human-readable report showing all findings
 * organized by severity, passed controls, experimental observations,
 * delta information, and skipped controls.
 */
import type { RunReport, DeltaResult } from '../types';
/**
 * Format a full detail report for display or file storage.
 *
 * @param report - The complete run report
 * @param delta - The delta result from comparison with previous scan
 * @returns Full multi-line detail report string
 */
export declare function formatDetail(report: RunReport, delta: DeltaResult): string;
//# sourceMappingURL=detail.d.ts.map