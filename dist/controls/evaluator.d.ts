/**
 * controls/evaluator.ts — ControlEvaluator: per-control PASS/FAIL/SKIP/ERROR logic.
 *
 * Given collected data and the control library, evaluates every control
 * and returns a ControlEvaluation array. Implements all 9 stable controls
 * with full logic and 8 experimental controls as stubs returning SKIP.
 */
import type { ControlLibrary, ControlEvaluation, CollectorResult, Exclusion } from '../types';
/**
 * ControlEvaluator evaluates each control in the library against collected data.
 *
 * Evaluation order per control:
 * 1. Check if control is applicable (mode == 1 for MVP)
 * 2. Check if excluded → EXCLUDED
 * 3. Check prerequisite → SKIP if not met
 * 4. Check if required source is available → ERROR if not
 * 5. Run check logic → PASS or FAIL
 */
export declare class ControlEvaluator {
    private readonly library;
    private readonly exclusions;
    constructor(library: ControlLibrary, exclusions: Exclusion[]);
    /**
     * Evaluate all controls in the library against collected data.
     *
     * @param collected - The combined data from all collectors
     * @returns An evaluation result for every control in the library
     */
    evaluate(collected: CollectorResult): ControlEvaluation[];
    /**
     * Evaluate a single control against collected data.
     * Handles the full evaluation pipeline: mode check, exclusion, prerequisite,
     * source availability, and control-specific logic.
     */
    private evaluateControl;
    /**
     * Evaluate a stable control with full check logic.
     */
    private evaluateStable;
    /**
     * Evaluate experimental controls. Some have real logic, others return SKIP stubs.
     */
    private evaluateExperimental;
    /** NC-OC-003: No ineffective deny command entries */
    private evalNCOC003;
    /** NC-OC-004: No open (unauthenticated) groups */
    private evalNCOC004;
    /** NC-OC-008: All configured channels healthy */
    private evalNCOC008;
    /** NC-OC-009: OpenClaw update available (INFO, not scored) */
    private evalNCOC009;
    /** NC-AUTH-001: Reverse proxy trust correctly configured */
    private evalNCAUTH001;
    /** NC-VERS-001: OpenClaw is behind latest release */
    private evalNCVERS001;
    /** NC-VERS-002: OpenClaw not more than 2 minor versions behind */
    private evalNCVERS002;
    /** NC-OC-012: Gateway authentication not configured */
    private evalNCOC012;
    /** NC-OC-013: Browser control requires gateway authentication */
    private evalNCOC013;
    /** NC-OC-014: Gateway auth token meets minimum length */
    private evalNCOC014;
    /** Build a base evaluation object with defaults for a control */
    private buildBaseEvaluation;
    /** Check if a finding with the given checkId exists in the findings list */
    private hasFinding;
    /** Find an active (non-expired) exclusion for the given control ID */
    private findActiveExclusion;
    /**
     * Compute the "minor version" distance between two YYYY.M.D version strings.
     * Uses the year-boundary formula from spec:
     * totalMonthsBehind = (latestYear - currentYear) * 12 + (latestMonth - currentMonth)
     *
     * @returns The distance in months, or null if versions can't be parsed
     */
    private computeVersionDistance;
}
//# sourceMappingURL=evaluator.d.ts.map