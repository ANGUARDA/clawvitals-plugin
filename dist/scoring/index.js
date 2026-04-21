/**
 * scoring/index.ts — Scorer: weighted deduction algorithm, band assignment, insufficient_data handling.
 *
 * Computes the primary security score and per-domain scores from stable
 * control evaluations. Only stable controls contribute to scoring.
 * Info-severity controls are evaluated but never deducted from the score.
 */
import { SEVERITY_DEDUCTION, BASE_SCORE, MIN_EVALUABLE_CONTROLS, MIN_DOMAIN_EVALUABLE, GREEN_THRESHOLD, AMBER_THRESHOLD, } from '../constants';
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
export class Scorer {
    /**
     * Compute overall and per-domain scores from stable control evaluations.
     *
     * @param evaluations - All control evaluations (stable + experimental)
     * @returns Score result with overall score, band, and domain breakdown
     */
    score(evaluations) {
        const stableEvals = evaluations.filter(e => e.status === 'stable');
        // Count results
        const stablePass = stableEvals.filter(e => e.result === 'PASS').length;
        const stableFail = stableEvals.filter(e => e.result === 'FAIL').length;
        const stableSkip = stableEvals.filter(e => e.result === 'SKIP').length;
        const stableError = stableEvals.filter(e => e.result === 'ERROR').length;
        const stableExcluded = stableEvals.filter(e => e.result === 'EXCLUDED').length;
        // Evaluable = PASS + FAIL (controls that actually ran)
        const evaluable = stableEvals.filter(e => e.result === 'PASS' || e.result === 'FAIL');
        // Compute score
        let numericScore = BASE_SCORE;
        for (const ev of stableEvals) {
            if (ev.result === 'FAIL') {
                numericScore -= SEVERITY_DEDUCTION[ev.severity];
            }
        }
        numericScore = Math.max(0, numericScore);
        // Determine band
        let score;
        let band;
        if (evaluable.length < MIN_EVALUABLE_CONTROLS) {
            score = 'insufficient_data';
            band = 'insufficient_data';
        }
        else {
            score = numericScore;
            band = this.assignBand(numericScore);
        }
        // Per-domain scores
        const domainMap = new Map();
        for (const ev of stableEvals) {
            const existing = domainMap.get(ev.domain) ?? [];
            existing.push(ev);
            domainMap.set(ev.domain, existing);
        }
        const domains = [];
        for (const [domain, evals] of domainMap) {
            const domainEvaluable = evals.filter(e => e.result === 'PASS' || e.result === 'FAIL');
            if (domainEvaluable.length < MIN_DOMAIN_EVALUABLE) {
                domains.push({
                    domain,
                    score: 'insufficient_data',
                    controls_evaluated: domainEvaluable.length,
                });
            }
            else {
                let domainScore = BASE_SCORE;
                for (const ev of evals) {
                    if (ev.result === 'FAIL') {
                        domainScore -= SEVERITY_DEDUCTION[ev.severity];
                    }
                }
                domains.push({
                    domain,
                    score: Math.max(0, domainScore),
                    controls_evaluated: domainEvaluable.length,
                });
            }
        }
        return {
            score,
            band,
            domains,
            stable_pass: stablePass,
            stable_fail: stableFail,
            stable_skip: stableSkip,
            stable_error: stableError,
            stable_excluded: stableExcluded,
        };
    }
    /**
     * Assign a score band based on numeric score thresholds.
     *
     * @param score - The numeric score (0-100)
     * @returns The corresponding band
     */
    assignBand(score) {
        if (score >= GREEN_THRESHOLD)
            return 'green';
        if (score >= AMBER_THRESHOLD)
            return 'amber';
        return 'red';
    }
}
//# sourceMappingURL=index.js.map