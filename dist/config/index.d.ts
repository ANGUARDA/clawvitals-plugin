/**
 * config/index.ts — ConfigManager: config.json, usage.json, exclusions.json.
 *
 * Manages all persistent state for ClawVitals. All files are written with
 * chmod 600 to protect sensitive data. Handles first-run initialization
 * and exclusion expiry checking.
 */
import type { ClawVitalsConfig, UsageState, Exclusion } from '../types';
/**
 * ConfigManager handles all persistent configuration and state files.
 *
 * File locations (relative to workspace):
 * - clawvitals/config.json — user configuration
 * - clawvitals/usage.json — usage statistics and state
 * - clawvitals/exclusions.json — control exclusions
 */
export declare class ConfigManager {
    private readonly baseDir;
    /**
     * @param workspaceDir - The OpenClaw workspace directory
     */
    constructor(workspaceDir: string);
    /**
     * Get the current configuration, initializing with defaults if needed.
     *
     * @returns The current ClawVitals configuration
     */
    getConfig(): ClawVitalsConfig;
    /**
     * Update configuration with partial values.
     *
     * @param partial - Fields to update
     */
    setConfig(partial: Partial<ClawVitalsConfig>): void;
    /**
     * Get the current usage state, initializing on first run.
     *
     * @returns The current usage state
     */
    getUsage(): UsageState;
    /**
     * Update usage state with partial values.
     *
     * @param partial - Fields to update
     */
    updateUsage(partial: Partial<UsageState>): void;
    /**
     * Get all exclusions from the exclusions file.
     *
     * @returns Array of exclusions (may be empty)
     */
    getExclusions(): Exclusion[];
    /**
     * Add an exclusion to the exclusions file.
     *
     * @param exclusion - The exclusion to add
     */
    addExclusion(exclusion: Exclusion): void;
    /**
     * Check if an exclusion is currently active (not expired).
     *
     * @param exclusion - The exclusion to check
     * @returns True if the exclusion is active
     */
    isExclusionActive(exclusion: Exclusion): boolean;
    /**
     * Check if any exclusions are stale (no expiry and older than 90 days).
     *
     * @returns True if any exclusions are stale
     */
    hasStaleExclusions(): boolean;
    /**
     * Check if this is a first run (usage.json doesn't exist or last_run_at is null).
     *
     * @returns True if this is the first scan
     */
    isFirstRun(): boolean;
    /** Ensure the base directory exists */
    private ensureDir;
    /** Write JSON to a file with secure (600) permissions */
    private writeSecureJson;
}
//# sourceMappingURL=index.d.ts.map