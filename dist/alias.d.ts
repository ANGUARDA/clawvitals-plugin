/**
 * alias.ts — Installation alias management for fleet management.
 *
 * The plugin assigns a random UUID to each installation (install_id).
 * For fleet management, users or agents can set a human-readable alias
 * that appears on the clawvitals.io/dashboard instead of the raw UUID.
 *
 * IMPORTANT: The alias is ALWAYS user-set. It is NEVER derived from:
 *   - Machine hostname
 *   - Username or home directory
 *   - IP address or MAC address
 *   - Any other machine identifier
 *
 * This preserves privacy: the only identifying information sent to the
 * telemetry endpoint is what the user explicitly chose to share.
 *
 * USAGE (via OpenClaw agent message):
 *   "set clawvitals alias prod-server-1"
 *   → stores alias in plugin config → included in next telemetry ping
 *
 * FLEET MANAGEMENT:
 *   On the dashboard, each installation shows as:
 *     prod-server-1  (iid: a3f2...)   score: 85/100  🟢
 *     dev-laptop     (iid: 7c1b...)   score: 70/100  🟡
 *     <unnamed>      (iid: 9e4d...)   score: 45/100  🔴
 *
 *   Without an alias, installations appear as <unnamed> on the dashboard.
 *   The raw install_id is always shown alongside for traceability.
 */
export declare const MAX_ALIAS_LENGTH = 64;
export interface AliasValidation {
    valid: boolean;
    error?: string;
    normalized?: string;
}
/**
 * Validate and normalize an alias string.
 * Returns normalized alias on success, or error message on failure.
 */
export declare function validateAlias(input: string): AliasValidation;
/**
 * Format a display string for an installation on the dashboard.
 * Shows alias + truncated install_id for traceability.
 */
export declare function formatInstallDisplay(installId: string, alias?: string): string;
//# sourceMappingURL=alias.d.ts.map