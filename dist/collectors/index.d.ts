/**
 * collectors/index.ts — CollectorOrchestrator: parallel data collection from all CLI sources.
 *
 * Invokes all 4 CLI data sources in parallel using Promise.allSettled so that
 * one failure never aborts the others. After security_audit completes, the
 * attack_surface detail string is parsed immediately.
 */
import type { CliRunner } from '../cli-runner';
import type { CollectorResult } from '../types';
/**
 * CollectorOrchestrator runs all data collection in parallel and assembles
 * a unified CollectorResult. Uses Promise.allSettled to ensure resilience —
 * each source is independent and a failure in one does not affect others.
 */
export declare class CollectorOrchestrator {
    private readonly cli;
    constructor(cli: CliRunner);
    /**
     * Collect data from all four CLI sources in parallel.
     *
     * @returns Combined results from all sources, including parsed attack surface
     */
    collect(): Promise<CollectorResult>;
}
//# sourceMappingURL=index.d.ts.map