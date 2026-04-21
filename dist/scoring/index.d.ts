/**
 * scoring/index.ts — Scorer: weighted deduction algorithm, band assignment, insufficient_data handling.
 *
 * Computes the primary security score and per-domain scores from stable
 * control evaluations. Only stable controls contribute to scoring.
 * Info-severity controls are evaluated but never deducted from the score.
 */
import type { ControlEvaluation, ScoreResult } from '../types';
/**
 * Scorer computes security posture scores from control evaluation results.
 *
 * Algorithm:
 * 1. Start with base score of 100
 * 2. For each stable FAIL: deduct SEVERITY_DEDUCTION[severity]
 * 3. Clamp to minimum of 0
 * 4. If fewer than 5 evaluable controls: insufficient_data
 * 5. Assign band: >= 90 green, >= 70 amber, else red
 */
export declare class Scorer {
    /**
     * Compute overall and per-domain scores from stable control evaluations.
     *
     * @param evaluations - All control evaluations (stable + experimental)
     * @returns Score result with overall score, band, and domain breakdown
     */
    score(evaluations: ControlEvaluation[]): ScoreResult;
    /**
     * Assign a score band based on numeric score thresholds.
     *
     * @param score - The numeric score (0-100)
     * @returns The corresponding band
     */
    private assignBand;
}
//# sourceMappingURL=index.d.ts.map