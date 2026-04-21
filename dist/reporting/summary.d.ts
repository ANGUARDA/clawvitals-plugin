/**
 * reporting/summary.ts — Summary message formatter.
 *
 * Produces a concise (<=400 character) summary message suitable for
 * delivery to messaging surfaces. Includes score, band, critical/high
 * finding count, and delta indicator.
 */
import type { RunReport, DeltaResult } from '../types';
/**
 * Format a summary message for delivery to the messaging surface.
 *
 * @param report - The complete run report
 * @param delta - The delta result from comparison with previous scan
 * @param staleExclusions - Whether there are stale exclusions (>90 days)
 * @returns A summary message string (<= 400 chars)
 */
export declare function formatSummary(report: RunReport, delta: DeltaResult, staleExclusions: boolean): string;
//# sourceMappingURL=summary.d.ts.map