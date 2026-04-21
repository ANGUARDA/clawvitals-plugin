/**
 * collectors/expanded/index.ts — ExpandedCollectorOrchestrator: parallel system-level collection.
 *
 * Runs all 8 expanded collectors in parallel via Promise.allSettled for resilience.
 */
import type { ExpandedCollectorResult } from '../../types';
export declare class ExpandedCollectorOrchestrator {
    collect(options?: {
        extra_ports?: Array<{
            port: number;
            service: string;
        }>;
    }): Promise<ExpandedCollectorResult>;
}
//# sourceMappingURL=index.d.ts.map