/**
 * scheduling/index.ts — SchedulerManager: cron list/add/edit wrappers.
 *
 * Manages the ClawVitals recurring scan schedule by wrapping the
 * `openclaw cron` CLI commands. Supports daily, weekly, monthly cadences.
 */
import type { CliRunner } from '../cli-runner';
/**
 * SchedulerManager wraps OpenClaw cron operations for managing recurring scans.
 */
export declare class SchedulerManager {
    private readonly cli;
    constructor(cli: CliRunner);
    /**
     * Ensure a recurring scan schedule exists with the specified cadence.
     * Creates a new cron job if none exists, or edits the existing one.
     *
     * @param cadence - The schedule cadence: 'daily', 'weekly', 'monthly', or 'none'
     */
    ensureSchedule(cadence: 'daily' | 'weekly' | 'monthly' | 'none'): Promise<void>;
    /**
     * Remove the recurring scan schedule if it exists.
     */
    removeSchedule(): Promise<void>;
    /**
     * Check if a recurring scan schedule currently exists.
     *
     * @returns True if the clawvitals cron job is registered
     */
    isScheduled(): Promise<boolean>;
}
//# sourceMappingURL=index.d.ts.map