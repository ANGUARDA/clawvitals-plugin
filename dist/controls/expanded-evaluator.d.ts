/**
 * controls/expanded-evaluator.ts — ExpandedEvaluator: per-control logic for expanded checks.
 *
 * Evaluates the 8 system-level expanded controls against ExpandedCollectorResult.
 * Results are reported separately from the primary stable score.
 */
import type { ExpandedCollectorResult, ExpandedEvaluation } from '../types';
export declare class ExpandedEvaluator {
    evaluate(result: ExpandedCollectorResult): ExpandedEvaluation[];
    private evalOllama;
    private evalNetwork;
    private evalSecretsFiles;
    private evalSecretsHistory;
    private evalTunnel;
    private evalDocker;
    private evalOsUpdates;
    private evalDiskEncryption;
}
//# sourceMappingURL=expanded-evaluator.d.ts.map