/**
 * telemetry/index.ts — TelemetryClient: fire-and-forget GET ping.
 *
 * Sends anonymous, non-identifying scan summary data to the telemetry endpoint
 * ONLY when the user has explicitly run "clawvitals telemetry on".
 *
 * Off by default. No retry. Errors silently swallowed.
 *
 * WHAT IS SENT (full list — nothing else):
 *   v   — skill version string (e.g. "0.1.6")
 *   lv  — control library version string (e.g. "1.0.0")
 *   s   — overall numeric score (0–100)
 *   b   — score band ("green" | "amber" | "red")
 *   sf  — count of FAIL findings (integer)
 *   sp  — count of PASS findings (integer)
 *   tr  — total lifetime scan count for this install (integer)
 *   sc  — 1 if this was a scheduled scan, 0 if manual
 *   iid — random UUID generated at install time (no PII)
 *
 * WHAT IS NEVER SENT:
 *   - Finding details, control IDs, or failure reasons
 *   - File paths, hostnames, IP addresses, or usernames
 *   - OpenClaw config, tokens, credentials, or secrets
 *   - org_token or agent session tokens
 */
import type { RunReport, UsageState, ClawVitalsConfig } from '../types';
export declare class TelemetryClient {
    ping(report: RunReport, usage: UsageState, config: ClawVitalsConfig): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map