/**
 * index.ts — ClawVitals plugin entry point.
 *
 * This plugin extends ClawVitals (the skill) with:
 *   - Recurring scheduled scans (cron)
 *   - Posture history stored locally and synced to clawvitals.io/dashboard
 *   - Regression and critical finding alerts via OpenClaw messaging
 *   - Fleet management via user-set installation aliases
 *
 * PLUGIN PATTERN:
 *   External OpenClaw plugins export a plain object (or function) with a
 *   `register(api: OpenClawPluginApi)` method. Tools implement the AgentTool
 *   interface from @mariozechner/pi-agent-core:
 *     { name, label, description, parameters (TSchema), execute(toolCallId, params) }
 *
 * TELEMETRY DEFAULT:
 *   The skill (on ClawHub) is stateless — no telemetry, no network calls, locked.
 *   The plugin defaults telemetry to ON because it exists to power clawvitals.io/dashboard.
 *   Without telemetry, the dashboard has no data. Users can opt out at any time.
 *
 * ALIAS:
 *   Users/agents can set a human-readable alias (e.g. "prod-server-1") for
 *   fleet management on the dashboard. NEVER derived from machine identifiers.
 */
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/core';
export * from './plugin-config.js';
export * from './telemetry.js';
export * from './scheduler.js';
export * from './alerts.js';
export * from './alias.js';
declare const clawvitalsPlugin: {
    id: string;
    name: string;
    description: string;
    configSchema: import("openclaw/plugin-sdk/core").OpenClawPluginConfigSchema;
    register(api: OpenClawPluginApi): void;
};
export default clawvitalsPlugin;
//# sourceMappingURL=index.d.ts.map