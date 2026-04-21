/**
 * scheduler.ts — Recurring scan scheduling via OpenClaw cron.
 *
 * The plugin registers a cron job that triggers ClawVitals scans on a schedule.
 * Default: 9:00 AM daily. Configurable via plugin config.
 *
 * On each scheduled scan:
 *   1. Run `clawvitals scan` (triggers the skill's scan pipeline)
 *   2. Send telemetry ping with scan summary
 *   3. Alert if regression detected (score drop or new FAIL)
 *   4. Alert if new critical finding (immediate, regardless of threshold)
 */
import type { PluginConfig } from './plugin-config.js';
export declare const DEFAULT_CRON = "0 9 * * *";
export interface SchedulerConfig {
    enabled: boolean;
    cron: string;
}
export declare function resolveSchedulerConfig(config: PluginConfig): SchedulerConfig;
/**
 * Validate a cron expression (basic 5-field check).
 * Returns error string if invalid, null if valid.
 */
export declare function validateCron(expr: string): string | null;
//# sourceMappingURL=scheduler.d.ts.map