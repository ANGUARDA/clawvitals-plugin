/**
 * reporting/storage.ts — StorageManager: run file persistence, last-success pointer, retention.
 *
 * Manages the filesystem layout for scan history:
 * - Each run stored in {workspace}/clawvitals/runs/{ISO-timestamp}/
 * - last-success.json pointer updated only on successful runs
 * - File permissions set to 600 for security
 */
import type { RunReport, RunMeta } from '../types';
/**
 * StorageManager handles reading and writing scan run data to the filesystem.
 *
 * Run directory layout:
 * - {workspace}/clawvitals/runs/{ISO-timestamp}/report.json
 * - {workspace}/clawvitals/runs/{ISO-timestamp}/report.txt
 * - {workspace}/clawvitals/last-success.json → points to last successful run
 */
export declare class StorageManager {
    private readonly baseDir;
    /**
     * @param workspaceDir - The OpenClaw workspace directory
     */
    constructor(workspaceDir: string);
    /** Get the absolute path to the runs directory */
    getRunsDir(): string;
    /**
     * Write a scan run to disk. Creates the run directory, writes report.json
     * and report.txt, and updates last-success.json if the run succeeded.
     *
     * @param report - The complete run report
     * @param detailText - Human-readable detail report text
     */
    writeRun(report: RunReport, detailText: string): void;
    /**
     * Load the last successful run report.
     *
     * Returns null if: pointer file doesn't exist, is corrupted/unparseable,
     * run_dir field is missing, or the pointed-to run file is missing.
     * Never throws — callers treat null as "no prior run".
     */
    loadLastRun(): RunReport | null;
    /**
     * List recent runs with metadata for the history command.
     *
     * @param limit - Maximum number of runs to return
     * @returns Array of run metadata sorted by timestamp (newest first)
     */
    listRuns(limit: number): RunMeta[];
    /**
     * Remove run directories older than the retention period.
     *
     * @param retentionDays - Number of days to retain runs
     */
    purgeOldRuns(retentionDays: number): void;
}
//# sourceMappingURL=storage.d.ts.map