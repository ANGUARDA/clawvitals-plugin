/**
 * constants.ts — All magic values, defaults, and version strings for ClawVitals.
 *
 * Every numeric threshold, default value, and configuration constant is
 * defined here to avoid magic numbers scattered across the codebase.
 */
import type { Severity, ClawVitalsConfig } from './types';
/** ClawVitals skill version (matches package.json) */
export declare const CONTROL_LIB_VERSION = "1.1.2";
/** Plugin version — update on each plugin release. */
export declare const PLUGIN_VERSION = "1.0.31";
/** Control library version bundled with this skill release */
export declare const LIBRARY_VERSION = "1.0.0";
/**
 * Score deduction applied when a stable control FAILs, keyed by severity.
 *
 * These values determine how much each failed control reduces the base score of 100.
 * - critical: Most severe — a single critical failure drops the score significantly
 * - info: Informational findings are never scored (deduction = 0)
 */
export declare const SEVERITY_DEDUCTION: Record<Severity, number>;
/** Base score before deductions are applied */
export declare const BASE_SCORE = 100;
/** Minimum number of evaluable (PASS or FAIL) stable controls required for a valid score */
export declare const MIN_EVALUABLE_CONTROLS = 5;
/** Minimum evaluable controls per domain before domain score is valid */
export declare const MIN_DOMAIN_EVALUABLE = 2;
/** Score threshold at or above which the band is 'green' */
export declare const GREEN_THRESHOLD = 90;
/** Score threshold at or above which the band is 'amber' (below green) */
export declare const AMBER_THRESHOLD = 70;
/**
 * Maximum number of minor versions behind latest before NC-VERS-002 fails.
 * Uses the year-boundary formula: (latestYear - currentYear) * 12 + (latestMonth - currentMonth)
 */
export declare const MAX_MINOR_VERSIONS_BEHIND = 2;
/** Default timeout for CLI commands in milliseconds */
export declare const CLI_TIMEOUT_MS = 30000;
/** Maximum age of a lock file (in seconds) before it's considered stale */
export declare const LOCK_STALE_SECONDS = 120;
/** Number of days after which an exclusion without an expiry is flagged as stale */
export declare const EXCLUSION_STALE_DAYS = 90;
/** Maximum character length for the summary message */
export declare const SUMMARY_MAX_CHARS = 400;
/** Number of top findings to include in scheduled scan alert messages */
export declare const ALERT_TOP_FINDINGS = 3;
/** Default number of runs to show in history */
export declare const HISTORY_DEFAULT_LIMIT = 10;
/** Default retention period for run history in days */
export declare const DEFAULT_RETENTION_DAYS = 90;
/** Binaries allowed to be executed by CliRunner */
export declare const ALLOWED_BINARIES: readonly string[];
/** Default telemetry endpoint (HTTPS only) */
export declare const DEFAULT_TELEMETRY_ENDPOINT = "https://telemetry.clawvitals.io/ping";
/** Default configuration values for a fresh install */
export declare const DEFAULT_CONFIG: ClawVitalsConfig;
/** ClawVitals workspace directory name (under the OpenClaw workspace) */
export declare const WORKSPACE_DIR = "clawvitals";
/** Subdirectory for run history */
export declare const RUNS_DIR = "runs";
/** Lock file name for concurrent scan prevention */
export declare const LOCK_FILE = ".lock";
/** Last-success pointer file name */
export declare const LAST_SUCCESS_FILE = "last-success.json";
/** Config file name */
export declare const CONFIG_FILE = "config.json";
/** Usage state file name */
export declare const USAGE_FILE = "usage.json";
/** Exclusions file name (default) */
export declare const EXCLUSIONS_FILE = "exclusions.json";
/** File permissions for sensitive files (owner read/write only) */
export declare const SECURE_FILE_MODE = 384;
/** Cron job name for scheduled scans */
export declare const CRON_JOB_NAME = "clawvitals:scheduled-scan";
/** Cron expressions for each schedule cadence */
export declare const CRON_EXPRESSIONS: Record<string, string>;
/** Regex pattern to extract version from `openclaw --version` output */
export declare const VERSION_REGEX: RegExp;
/** Map score bands to emoji indicators */
export declare const BAND_EMOJI: Record<string, string>;
//# sourceMappingURL=constants.d.ts.map