/**
 * alerts.ts — Regression and critical finding alert logic.
 *
 * The plugin evaluates each scan result against the previous scan to determine
 * whether to alert. Two alert categories:
 *
 *   REGRESSION: Score dropped OR new FAIL findings appeared since last scan
 *   CRITICAL:   A critical-severity finding is present (alert immediately)
 *
 * Alert delivery is handled by the OpenClaw messaging layer — the plugin
 * produces an alert payload and OpenClaw routes it to the user's channels.
 */
import type { PluginConfig } from './plugin-config.js';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export interface ScanSnapshot {
    score: number | 'insufficient_data';
    band: string;
    fail_count: number;
    critical_count: number;
    scan_ts: string;
}
export interface AlertResult {
    should_alert: boolean;
    reason: string;
    severity: AlertSeverity;
    message: string;
}
export interface AlertConfig {
    on_regression: boolean;
    on_new_critical: boolean;
    threshold: AlertSeverity;
}
export declare function resolveAlertConfig(config: PluginConfig): AlertConfig;
/**
 * Evaluate whether to alert based on current vs previous scan.
 * Returns null if no alert is needed.
 */
export declare function evaluateAlert(current: ScanSnapshot, previous: ScanSnapshot | null, alertConfig: AlertConfig): AlertResult | null;
//# sourceMappingURL=alerts.d.ts.map