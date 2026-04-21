/**
 * telemetry.ts — Plugin telemetry client.
 *
 * The ClawVitals skill (on ClawHub) is stateless and makes no network calls — it has
 * no telemetry at all. The skill is locked and will not change.
 *
 * The plugin is different: it exists specifically to connect your installation to
 * clawvitals.io/dashboard. Telemetry IS the product — without it, the dashboard has
 * no data. So the plugin defaults telemetry to ON (opt-out, not opt-in).
 *
 * Users can opt out at any time:
 *   openclaw plugins config clawvitals set telemetry.enabled false
 *
 * WHAT IS SENT (full list — nothing else):
 *   v     — skill version string (e.g. "1.2.4")
 *   lv    — control library version (e.g. "1.0.0")
 *   s     — overall numeric score (0–100)
 *   b     — score band ("green" | "amber" | "red")
 *   sf    — count of FAIL findings
 *   sp    — count of PASS findings
 *   tr    — total lifetime scan count for this install
 *   sc    — 1 if scheduled, 0 if manual
 *   iid   — random UUID generated at plugin install time (no PII)
 *   alias — user-set display name for fleet management (OPTIONAL, user-controlled)
 *
 * WHAT IS NEVER SENT:
 *   - Hostnames, usernames, IP addresses, or file paths
 *   - Finding details, control IDs, or failure reasons
 *   - OpenClaw config, tokens, credentials, or secrets
 *   - Machine identifiers of any kind (only user-set alias, and only if configured)
 */
import type { PluginConfig, PluginInstallState } from './plugin-config.js';
export interface ScanSummary {
    version: string;
    library_version: string;
    score: number | 'insufficient_data';
    band: string;
    fail_count: number;
    pass_count: number;
    is_scheduled: boolean;
}
export declare class PluginTelemetryClient {
    private config;
    private state;
    constructor(config: PluginConfig, state: PluginInstallState);
    /**
     * Whether telemetry is enabled.
     * Defaults to TRUE — the plugin's purpose is dashboard connectivity.
     * The skill has no telemetry at all (stateless, no network calls).
     * Users opt OUT rather than opt IN.
     */
    get isEnabled(): boolean;
    get endpoint(): string;
    /**
     * Fire-and-forget ping with scan summary.
     * Errors are silently swallowed — telemetry must never affect scan operation.
     */
    ping(scan: ScanSummary): Promise<void>;
}
//# sourceMappingURL=telemetry.d.ts.map