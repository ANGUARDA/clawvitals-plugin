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
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { emptyPluginConfigSchema } from 'openclaw/plugin-sdk/core';
import { validateAlias, formatInstallDisplay } from './alias.js';
import { validateCron, DEFAULT_CRON } from './scheduler.js';
// ── Scan pipeline imports (for cron-triggered scans) ──────────────────────
import { CliRunner } from './cli-runner.js';
import { CollectorOrchestrator } from './collectors/index.js';
import { ControlEvaluator } from './controls/evaluator.js';
import { loadControlLibrary } from './controls/library.js';
import { Scorer } from './scoring/index.js';
import { DeltaDetector } from './scoring/delta.js';
import { ReportGenerator } from './reporting/index.js';
import { StorageManager } from './reporting/storage.js';
import { ConfigManager } from './config/index.js';
import { TelemetryClient } from './telemetry/index.js';
import { SchedulerManager } from './scheduling/index.js';
import { ScanOrchestrator } from './orchestrator.js';
import { formatSummary } from './reporting/summary.js';
import { formatDetail } from './reporting/detail.js';
import { CRON_JOB_NAME, PLUGIN_VERSION } from './constants.js';
import { PluginTelemetryClient } from './telemetry.js';
import { evaluateAlert, resolveAlertConfig } from './alerts.js';
import { scanCognitiveFiles } from './cognitive/inventory.js';
import { approveFile, loadBaseline, saveBaseline } from './cognitive/drift.js';
import { getLatestReport } from './cognitive/export.js';
import { scanForTampering } from './cognitive/tamper.js';
import { detectConfigDrift } from './cognitive/config-drift.js';
const Type = {
    Object: (props, opts) => ({
        type: 'object',
        properties: props,
        additionalProperties: opts?.additionalProperties ?? false,
    }),
    String: (opts) => ({
        type: 'string',
        ...(opts ?? {}),
    }),
    Boolean: (opts) => ({
        type: 'boolean',
        ...(opts ?? {}),
    }),
    Optional: (schema) => (
    // Only add nullable:true when a type field exists — AJV (used by OpenClaw) throws
    // '"nullable" cannot be used without "type"' for oneOf/anyOf schemas.
    // Without a required[] array, all object properties are already optional.
    'type' in schema ? { ...schema, nullable: true } : { ...schema }),
    Union: (schemas, opts) => ({ oneOf: schemas, ...(opts ?? {}) }),
    Literal: (value) => ({ type: 'string', const: value }),
};
export * from './plugin-config.js';
export * from './telemetry.js';
export * from './scheduler.js';
export * from './alerts.js';
export * from './alias.js';
// ── Workspace resolution ───────────────────────────────────────────────────
/** Resolve the OpenClaw workspace root (where clawvitals/ sub-dir lives). */
function resolveWorkspaceDir() {
    return path.join(os.homedir(), '.openclaw', 'workspace');
}
// ── State file (persisted to plugin data dir) ──────────────────────────────
const PLUGIN_DIR = path.join(os.homedir(), '.openclaw', 'plugins', 'clawvitals');
const CONFIG_FILE = path.join(PLUGIN_DIR, 'config.json');
const STATE_FILE = path.join(PLUGIN_DIR, 'state.json');
function ensureDir() {
    if (!fs.existsSync(PLUGIN_DIR)) {
        fs.mkdirSync(PLUGIN_DIR, { recursive: true, mode: 0o700 });
    }
}
function loadConfig() {
    ensureDir();
    try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
function saveConfig(config) {
    ensureDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}
function loadState() {
    ensureDir();
    try {
        const raw = fs.readFileSync(STATE_FILE, 'utf8');
        return JSON.parse(raw);
    }
    catch {
        // First run — generate install identity
        const state = {
            install_id: randomUUID(),
            installed_at: new Date().toISOString(),
            total_pings: 0,
            last_ping_at: null,
        };
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
        return state;
    }
}
function saveState(state) {
    ensureDir();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
}
// ── Scan pipeline factory ─────────────────────────────────────────────────
/**
 * Build the full scan dependency tree.
 * workspaceDir is the OpenClaw workspace directory (passed from plugin context).
 */
function buildScanDependencies(workspaceDir) {
    const cli = new CliRunner('openclaw');
    const collector = new CollectorOrchestrator(cli);
    const config = new ConfigManager(workspaceDir);
    const exclusions = config.getExclusions();
    const library = loadControlLibrary();
    const evaluator = new ControlEvaluator(library, exclusions);
    const scorer = new Scorer();
    const delta = new DeltaDetector();
    const storage = new StorageManager(workspaceDir);
    const reporter = new ReportGenerator(storage);
    const telemetry = new TelemetryClient();
    const scheduler = new SchedulerManager(cli);
    return new ScanOrchestrator(collector, evaluator, scorer, delta, reporter, storage, config, telemetry, scheduler, workspaceDir);
}
/**
 * Run a scheduled scan, evaluate alerts, send plugin telemetry.
 * Returns a summary string to deliver to the user (or null for silent clean runs).
 */
async function runScheduledScan(workspaceDir) {
    const orchestrator = buildScanDependencies(workspaceDir);
    const report = await orchestrator.run({ isScheduled: true });
    // Build plugin telemetry ping
    const pluginConfig = loadConfig();
    const pluginState = loadState();
    const telemetryClient = new PluginTelemetryClient(pluginConfig, pluginState);
    // M5: Exclude info-severity FAILs from fail count (NC-OC-009 is INFO/not-scored)
    const stableFails = report.dock_analysis.stable.findings.filter(f => f.result === 'FAIL' && f.severity !== 'info').length;
    const stablePasses = report.dock_analysis.stable.findings.filter(f => f.result === 'PASS').length;
    const score = report.dock_analysis.stable.score;
    await telemetryClient.ping({
        version: report.version,
        library_version: report.library_version,
        score: typeof score === 'number' ? score : 'insufficient_data',
        band: report.dock_analysis.stable.band,
        fail_count: stableFails,
        pass_count: stablePasses,
        is_scheduled: true,
    });
    // Update plugin ping count in state
    pluginState.total_pings = (pluginState.total_pings ?? 0) + 1;
    pluginState.last_ping_at = new Date().toISOString();
    saveState(pluginState);
    // Evaluate alert: compare to previous run snapshot from delta
    const alertConfig = resolveAlertConfig(pluginConfig);
    // M5: stableFails already excludes info-severity FAILs (NC-OC-009 is INFO/not-scored)
    const currentSnapshot = {
        score: typeof score === 'number' ? score : 'insufficient_data',
        band: report.dock_analysis.stable.band,
        fail_count: stableFails,
        critical_count: report.dock_analysis.stable.findings.filter(f => f.result === 'FAIL' && f.severity === 'critical').length,
        scan_ts: report.meta.scan_ts,
    };
    // M2: Load previous snapshot directly from StorageManager for accurate fail counts
    // M5: Exclude info-severity FAILs from fail_count (NC-OC-009 is INFO/not-scored)
    const previousRun = new StorageManager(workspaceDir).loadLastRun();
    const previousSnapshot = previousRun
        ? {
            score: previousRun.dock_analysis.stable.score,
            band: previousRun.dock_analysis.stable.band,
            fail_count: previousRun.dock_analysis.stable.findings.filter(f => f.result === 'FAIL' && f.severity !== 'info').length,
            critical_count: previousRun.dock_analysis.stable.findings.filter(f => f.result === 'FAIL' && f.severity === 'critical').length,
            scan_ts: previousRun.meta.scan_ts,
        }
        : null;
    // Cognitive tamper scan (NC-OC-011 experimental)
    const cogInventory = scanCognitiveFiles(workspaceDir);
    const tamperResult = scanForTampering(cogInventory.files);
    let tamperNote = '';
    if (tamperResult.findings.length === 0) {
        tamperNote = '\n\n✅ No suspicious patterns detected in cognitive files.';
    }
    else {
        const lines = tamperResult.findings.map(f => `⚠️ Suspicious pattern detected: ${f.pattern_type}. Review your cognitive files manually — do not share the content if it looks like an injection attempt.`);
        tamperNote = '\n\n' + lines.join('\n');
    }
    const alert = evaluateAlert(currentSnapshot, previousSnapshot, alertConfig);
    if (alert) {
        // Build a compact failing controls section with remediation links
        const failingControls = report.dock_analysis.stable.findings
            .filter(f => f.result === 'FAIL' && (f.severity === 'critical' || f.severity === 'high'))
            .map(f => `  [${f.control_id}] ${f.control_name}\n  Fix: ${f.remediation}`);
        const failSection = failingControls.length > 0
            ? `\n\nFailing controls:\n${failingControls.join('\n')}`
            : '';
        return `${pluginHeader()}\n\n${alert.message}${failSection}${tamperNote}\n\n📊 View dashboard: https://clawvitals.io/dashboard`;
    }
    // If no alert but tamper findings exist, still report them
    if (tamperResult.findings.length > 0) {
        return `${pluginHeader()}\n\n${tamperNote.trim()}\n\n📊 View dashboard: https://clawvitals.io/dashboard`;
    }
    // Silent — no regression, no new criticals, no tampering. Return null (don't send a message).
    return null;
}
// ── Plugin header ─────────────────────────────────────────────────────────
/** One-line header prepended to all plugin-driven scan output. */
function pluginHeader() {
    return `ClawVitals Plugin v${PLUGIN_VERSION} 🔌`;
}
// ── Intent matchers ───────────────────────────────────────────────────────
// the plugin intercepts them before the skill (or LLM) gets a chance.
// Re-export for convenience (consumers can import from either location)
// ── Manual scan runner ────────────────────────────────────────────────────
/**
 * Run a manual (user-triggered) scan.
 * Returns the full formatted output including the plugin header.
 */
async function runManualScan(workspaceDir, detailed, mode = 'standard', extra_ports) {
    const orchestrator = buildScanDependencies(workspaceDir);
    const report = await orchestrator.run({ isScheduled: false, mode, extra_ports });
    // Fire plugin telemetry
    const pluginConfig = loadConfig();
    const pluginState = loadState();
    const telemetryClient = new PluginTelemetryClient(pluginConfig, pluginState);
    const stableFails = report.dock_analysis.stable.findings.filter(f => f.result === 'FAIL').length;
    const stablePasses = report.dock_analysis.stable.findings.filter(f => f.result === 'PASS').length;
    await telemetryClient.ping({
        version: report.version,
        library_version: report.library_version,
        score: typeof report.dock_analysis.stable.score === 'number'
            ? report.dock_analysis.stable.score
            : 'insufficient_data',
        band: report.dock_analysis.stable.band,
        fail_count: stableFails,
        pass_count: stablePasses,
        is_scheduled: false,
    });
    // Update ping state
    pluginState.total_pings = (pluginState.total_pings ?? 0) + 1;
    pluginState.last_ping_at = new Date().toISOString();
    saveState(pluginState);
    const delta = report.dock_analysis.delta ?? {
        new_findings: [], resolved_findings: [], new_checks: [],
    };
    const staleExclusions = false; // manual scans: no stale exclusion warning needed
    // Cognitive tamper scan (NC-OC-011 experimental)
    const cogInventory = scanCognitiveFiles(workspaceDir);
    const tamperResult = scanForTampering(cogInventory.files);
    let tamperNote = '';
    if (tamperResult.findings.length === 0) {
        tamperNote = '\n\n✅ No suspicious patterns detected in cognitive files.';
    }
    else {
        const lines = tamperResult.findings.map(f => `⚠️ Suspicious pattern detected: ${f.pattern_type}. Review your cognitive files manually — do not share the content if it looks like an injection attempt.`);
        tamperNote = '\n\n' + lines.join('\n');
    }
    // Configuration drift detection
    const storage = new StorageManager(workspaceDir);
    const previousRun = storage.loadLastRun();
    let driftNote = '';
    if (previousRun) {
        const driftResult = detectConfigDrift(report.sources, previousRun.sources);
        if (driftResult.has_drift) {
            const changeLines = driftResult.changes.map(c => {
                if (c.change_type === 'added')
                    return `  • ${c.field}: appeared (was not present)`;
                if (c.change_type === 'removed')
                    return `  • ${c.field}: removed (was ${JSON.stringify(c.previous)})`;
                return `  • ${c.field}: ${JSON.stringify(c.previous)} → ${JSON.stringify(c.current)}`;
            });
            driftNote = '\n\n🔧 Configuration changes since last scan:\n' + changeLines.join('\n');
        }
    }
    const header = pluginHeader();
    const body = detailed
        ? formatDetail(report, delta)
        : formatSummary(report, delta, staleExclusions);
    const dashboardLine = `\n📊 View your dashboard: https://clawvitals.io/dashboard`;
    // Format expanded controls section if present
    let expandedSection = '';
    if (report.dock_analysis.expanded) {
        const { findings, new_failures, new_passes } = report.dock_analysis.expanded;
        const skipped = findings.filter(f => f.result === 'SKIP').length;
        expandedSection = '\n\n━━━ EXPANDED CONTROLS ━━━━━━━━━━━━━━━━━━━━━';
        for (const f of findings) {
            const icon = f.result === 'PASS' ? '✅' : f.result === 'FAIL' ? '❌' : f.result === 'SKIP' ? '⏭️' : '⚠️';
            expandedSection += `\n${icon} ${f.control_id} ${f.name}: ${f.result}`;
            if (f.result === 'FAIL') {
                expandedSection += `\n   Evidence: ${f.evidence}`;
                expandedSection += `\n   Fix: ${f.remediation}`;
            }
        }
        expandedSection += `\nExpanded: ${new_failures} new findings · ${new_passes} passed · ${skipped} skipped`;
    }
    let output = `${header}\n\n${body}${expandedSection}${tamperNote}${driftNote}${dashboardLine}`;
    // Heartbeat suggestion on first scan
    if (pluginState.total_pings === 1) {
        const interval = 30;
        output += `\n\n💡 Tip: Add this to your HEARTBEAT.md for automatic checks every ${interval} minutes:\n- Run clawvitals and report any new issues since last check`;
    }
    return output;
}
function nextCronDescription(cron, enabled) {
    if (!enabled)
        return 'N/A (disabled)';
    if (cron === DEFAULT_CRON)
        return 'daily at 9:00 AM';
    return `per schedule: \`${cron}\``;
}
/** Full command reference returned by "clawvitals help". */
function getHelpText() {
    return `ClawVitals Plugin v${PLUGIN_VERSION} 🔌 — Command Reference

SCAN COMMANDS
  run clawvitals              Standard scan — 9 stable controls, scored
  run clawvitals --expanded   Expanded scan — adds system-level checks (Ollama, ports, Docker, disk, OS updates, secrets)
  run clawvitals --standard   Explicit standard scan (same as default)

CONFIGURATION
  clawvitals status           Show current plugin status (schedule, telemetry, alias, install ID)
  clawvitals help             Show this command reference

AGENT TOOLS (invoked by the agent in response to natural language — not typed as chat commands)
  clawvitals_set_alias        Set a display name for this install on the dashboard (max 64 chars)
  clawvitals_show_identity    Show install ID, alias, and total pings
  clawvitals_telemetry        Enable or disable anonymous telemetry
  clawvitals_set_schedule     Set or change the recurring scan schedule (cron expression + enabled flag)
  clawvitals_exclude          Suppress a control from reports (requires control ID, reason, optional expiry)
  clawvitals_exclusions       List all active control exclusions
  clawvitals_approve_baseline          Approve a cognitive file into the drift-detection baseline
  clawvitals_set_cognitive_monitoring  Include or exclude a file from drift detection
  clawvitals_export                    Export the most recent scan report (markdown or path)

NC-NET-001 CONFIGURATION (extra ports)
  By default NC-NET-001 scans: 22 (SSH), 2375/2376 (Docker API), 4000, 5000, 8080, 8443, 8888, 9000, 9090
  To scan additional ports, add to your plugin config (~/.openclaw/plugins/clawvitals/config.json):
    { "network": { "extra_ports": [{ "port": 3001, "service": "My service" }] } }
  Extra ports are merged with the defaults — they do not replace them.

LINKS
  Docs:      https://clawvitals.io/docs
  Controls:  https://clawvitals.io/docs/controls
  Dashboard: https://clawvitals.io/dashboard`;
}
function textResult(text) {
    return {
        content: [{ type: 'text', text }],
        details: null,
    };
}
// ── Tool definitions ───────────────────────────────────────────────────────
const SetAliasSchema = Type.Object({
    alias: Type.String({
        description: 'Display name for this installation, e.g. "prod-server-1". Max 64 chars.',
        minLength: 1,
        maxLength: 64,
    }),
});
const SetScheduleSchema = Type.Object({
    cron: Type.Optional(Type.String({
        description: '5-field cron expression, e.g. "0 9 * * *" for 9 AM daily.',
    })),
    enabled: Type.Optional(Type.Boolean({
        description: 'true to enable scheduled scans, false to disable.',
    })),
});
const TelemetrySchema = Type.Object({
    enabled: Type.Boolean({
        description: 'true to enable telemetry (default), false to opt out.',
    }),
});
// ── Plugin ─────────────────────────────────────────────────────────────────
const clawvitalsPlugin = {
    id: 'clawvitals',
    name: 'ClawVitals',
    description: 'Security posture tracking, recurring scans, delta alerts, and fleet dashboard.',
    configSchema: emptyPluginConfigSchema(),
    register(api) {
        // ── clawvitals_set_alias ─────────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_set_alias',
            label: 'ClawVitals: Set Alias',
            description: 'Set a human-readable display name for this OpenClaw installation on the ' +
                'ClawVitals dashboard. Useful for fleet management so installs show as ' +
                '"prod-server-1" instead of a raw UUID. Max 64 chars.',
            parameters: SetAliasSchema,
            execute: async (_id, params) => {
                const result = validateAlias(params.alias);
                if (!result.valid) {
                    return textResult(`❌ Invalid alias: ${result.error}`);
                }
                const config = loadConfig();
                config.telemetry = { ...config.telemetry, alias: result.normalized };
                saveConfig(config);
                const state = loadState();
                const display = formatInstallDisplay(state.install_id, result.normalized);
                return textResult(`✅ Alias set to "${result.normalized}".\n` +
                    `Dashboard display: ${display}\n` +
                    `It will appear on clawvitals.io/dashboard from your next scan.`);
            },
        }), { names: ['clawvitals_set_alias'] });
        // ── clawvitals_show_identity ─────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_show_identity',
            label: 'ClawVitals: Show Identity',
            description: 'Show the ClawVitals install ID and alias for this installation. ' +
                'The install ID is a random UUID — no PII. Used for fleet management on the dashboard.',
            parameters: Type.Object({}),
            execute: async (_id, _params) => {
                const state = loadState();
                const config = loadConfig();
                const alias = config.telemetry?.alias;
                const display = formatInstallDisplay(state.install_id, alias);
                const aliasLine = alias
                    ? `🏷️  Alias:       ${alias}`
                    : `🏷️  Alias:       (not set — use clawvitals_set_alias)`;
                return textResult(`🆔 ClawVitals Identity\n\n` +
                    `📍 Install ID:  ${state.install_id}\n` +
                    `${aliasLine}\n` +
                    `📊 Dashboard:   ${display}\n` +
                    `📅 Installed:   ${state.installed_at}\n` +
                    `🔢 Total pings: ${state.total_pings}`);
            },
        }), { names: ['clawvitals_show_identity'] });
        // ── clawvitals_telemetry ─────────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_telemetry',
            label: 'ClawVitals: Telemetry',
            description: 'Enable or disable ClawVitals telemetry — anonymous posture data sent to ' +
                'clawvitals.io/dashboard. Enabled by default because it powers the dashboard. ' +
                'Disabling stops data appearing on the dashboard.',
            parameters: TelemetrySchema,
            execute: async (_id, params) => {
                const config = loadConfig();
                config.telemetry = { ...config.telemetry, enabled: params.enabled };
                saveConfig(config);
                const status = params.enabled ? 'enabled ✅' : 'disabled ❌';
                const note = params.enabled
                    ? 'Scan summaries will be sent to clawvitals.io/dashboard from your next scan.'
                    : 'No data will be sent to the dashboard. Local scan history is unaffected.';
                return textResult(`ClawVitals telemetry ${status}.\n${note}`);
            },
        }), { names: ['clawvitals_telemetry'] });
        // ── clawvitals_set_schedule ──────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_set_schedule',
            label: 'ClawVitals: Set Schedule',
            description: 'Set the cron expression for recurring ClawVitals scans. ' +
                'Default is daily at 9 AM (0 9 * * *). Pass enabled=false to disable scheduling.',
            parameters: SetScheduleSchema,
            execute: async (_id, params) => {
                if (params.cron === undefined && params.enabled === undefined) {
                    return textResult('❌ Provide at least one of: cron (expression) or enabled (true/false).');
                }
                const config = loadConfig();
                const schedule = { ...config.schedule };
                if (params.enabled !== undefined)
                    schedule.enabled = params.enabled;
                if (params.cron !== undefined) {
                    const err = validateCron(params.cron);
                    if (err)
                        return textResult(`❌ Invalid cron expression: ${err}`);
                    schedule.cron = params.cron;
                }
                config.schedule = schedule;
                saveConfig(config);
                const isEnabled = schedule.enabled !== false;
                const cron = schedule.cron ?? DEFAULT_CRON;
                // Register or remove the cron job via OpenClaw CLI
                try {
                    const cli = new CliRunner('openclaw');
                    const scheduler = new SchedulerManager(cli);
                    if (isEnabled) {
                        // ensureSchedule maps the cron expression to a named cadence for
                        // the CLI. We pass the raw cron directly via the custom path.
                        const exists = await scheduler.isScheduled();
                        if (exists) {
                            await cli.run(['cron', 'edit', '--name', CRON_JOB_NAME, '--cron', cron]);
                        }
                        else {
                            await cli.run([
                                'cron', 'add',
                                '--name', CRON_JOB_NAME,
                                '--cron', cron,
                                '--handler', 'clawvitals:scheduled-scan',
                            ]);
                        }
                    }
                    else {
                        await scheduler.removeSchedule();
                    }
                }
                catch (err) {
                    return textResult(`⚠️ Config saved but cron registration failed: ${err.message}\n` +
                        `You can retry with: openclaw cron add --name ${CRON_JOB_NAME} --cron "${cron}" --handler clawvitals:scheduled-scan`);
                }
                return textResult(`✅ Schedule updated.\n` +
                    `Status:   ${isEnabled ? 'enabled ✅' : 'disabled ❌'}\n` +
                    `Cron:     ${cron}\n` +
                    `Next run: ${nextCronDescription(cron, isEnabled)}`);
            },
        }), { names: ['clawvitals_set_schedule'] });
        // ── clawvitals_status ────────────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_status',
            label: 'ClawVitals: Status',
            description: 'Show the current ClawVitals plugin status: schedule, telemetry, alias, and install identity.',
            parameters: Type.Object({}),
            execute: async (_id, _params) => {
                const workspaceDir = resolveWorkspaceDir();
                const config = loadConfig();
                const state = loadState();
                const telemetryEnabled = config.telemetry?.enabled !== false;
                const scheduleEnabled = config.schedule?.enabled === true;
                const cron = config.schedule?.cron ?? DEFAULT_CRON;
                const alias = config.telemetry?.alias;
                // Cognitive baseline status — read from stored baseline only (no live file scan)
                const baseline = loadBaseline(workspaceDir);
                const baselineEntries = baseline?.files ?? [];
                const driftIcon = (excluded, approved) => {
                    if (excluded)
                        return '— excluded';
                    if (!approved)
                        return '❓ not baselined';
                    return '✅';
                };
                // Derive monitored vs excluded from baseline entries + defaults
                const { DRIFT_MONITORED_BY_DEFAULT, DRIFT_EXCLUDED_BY_DEFAULT } = await import('./cognitive/inventory.js');
                const monitoredLines = [];
                const excludedNames = [];
                // Show all known files from baseline + defaults
                const knownFiles = new Set([
                    ...Array.from(DRIFT_MONITORED_BY_DEFAULT),
                    ...Array.from(DRIFT_EXCLUDED_BY_DEFAULT),
                    ...baselineEntries.map(f => f.name),
                ]);
                for (const name of knownFiles) {
                    const entry = baselineEntries.find(f => f.name === name);
                    const excluded = entry?.excluded === true || (entry === undefined && DRIFT_EXCLUDED_BY_DEFAULT.has(name));
                    if (excluded) {
                        excludedNames.push(name);
                    }
                    else {
                        const approved = entry !== undefined && entry.excluded !== true;
                        monitoredLines.push(`    ${name.padEnd(16)} ${driftIcon(false, approved)}`);
                    }
                }
                const cogSection = `\n📁 Cognitive files (drift monitoring):\n` +
                    (monitoredLines.length > 0
                        ? monitoredLines.join('\n')
                        : '    (none monitored)') +
                    (excludedNames.length > 0
                        ? `\n  Excluded from monitoring:\n` + excludedNames.map(n => `    ${n}`).join('\n')
                        : '');
                return textResult(`📊 ClawVitals Plugin Status\n\n` +
                    `🗓️  Schedule:    ${scheduleEnabled ? `enabled ✅  (${cron})` : 'disabled ❌'}\n` +
                    `⏭️  Next run:    ${nextCronDescription(cron, scheduleEnabled)}\n` +
                    `📡 Telemetry:   ${telemetryEnabled ? 'enabled ✅' : 'disabled ❌'}\n` +
                    `🏷️  Alias:       ${alias ?? '(not set)'}\n` +
                    `🆔 Install ID:  ${state.install_id}\n` +
                    `🔢 Total pings: ${state.total_pings}` +
                    cogSection);
            },
        }), { names: ['clawvitals_status'] });
        // ── clawvitals_exclude ───────────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_exclude',
            label: 'ClawVitals: Add Exclusion',
            description: 'Suppress a specific ClawVitals control from being flagged. ' +
                'Use when a finding is intentional or not applicable to your setup. ' +
                'Exclusions are stored in exclusions.json and shown in scan reports. ' +
                'Optional: set an expiry date (ISO 8601) after which the exclusion is automatically lifted.',
            parameters: Type.Object({
                control_id: Type.String({
                    description: 'Control ID to exclude, e.g. "NC-OC-005"',
                    pattern: '^NC-[A-Z]+-\\d+$',
                }),
                reason: Type.String({
                    description: 'Why this control is being excluded.',
                    minLength: 5,
                    maxLength: 200,
                }),
                expires: Type.Optional(Type.String({
                    description: 'ISO 8601 expiry date, e.g. "2026-06-01". Omit for no expiry.',
                })),
            }),
            execute: async (_id, params) => {
                const workspaceDir = resolveWorkspaceDir();
                const config = new ConfigManager(workspaceDir);
                const exclusion = {
                    controlId: params.control_id.toUpperCase(),
                    reason: params.reason,
                    created_at: new Date().toISOString(),
                    created_by: 'plugin',
                    ...(params.expires ? { expires: params.expires } : {}),
                };
                config.addExclusion(exclusion);
                const expiryStr = params.expires
                    ? `Expires: ${params.expires}`
                    : 'No expiry (permanent until removed)';
                return textResult(`✅ Exclusion added for ${exclusion.controlId}.\n` +
                    `Reason: ${exclusion.reason}\n` +
                    `${expiryStr}\n\n` +
                    `This control will show as EXCLUDED in future scans. ` +
                    `Run 'clawvitals exclusions' to view all active exclusions.`);
            },
        }), { names: ['clawvitals_exclude'] });
        // ── clawvitals_exclusions ────────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_exclusions',
            label: 'ClawVitals: List Exclusions',
            description: 'List all active ClawVitals exclusions. Shows control ID, reason, creation date, ' +
                'and expiry. Expired exclusions are shown separately.',
            parameters: Type.Object({}),
            execute: async (_id, _params) => {
                const workspaceDir = resolveWorkspaceDir();
                const config = new ConfigManager(workspaceDir);
                const all = config.getExclusions();
                if (all.length === 0) {
                    return textResult('No exclusions configured. All controls are evaluated normally.');
                }
                const now = new Date();
                const active = all.filter(ex => !ex.expires || new Date(ex.expires) > now);
                const expired = all.filter(ex => ex.expires && new Date(ex.expires) <= now);
                const formatExclusion = (ex) => {
                    const expiry = ex.expires ? `expires ${ex.expires}` : 'permanent';
                    return `• ${ex.controlId} — ${ex.reason} (${expiry}, added ${ex.created_at.slice(0, 10)})`;
                };
                let out = `📋 ClawVitals Exclusions\n\n`;
                out += `Active (${active.length}):\n${active.map(formatExclusion).join('\n') || '  none'}`;
                if (expired.length > 0) {
                    out += `\n\nExpired (${expired.length}) — no longer suppressing:\n${expired.map(formatExclusion).join('\n')}`;
                }
                return textResult(out);
            },
        }), { names: ['clawvitals_exclusions'] });
        // ── clawvitals_approve_baseline ─────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_approve_baseline',
            label: 'ClawVitals: Approve Cognitive Baseline',
            description: 'Approve a cognitive file (or all files) into the drift-detection baseline. ' +
                'Pass filename="all" to approve every file in the current inventory.',
            parameters: Type.Object({
                filename: Type.String({
                    description: 'Name of the cognitive file to approve (e.g. "SOUL.md"), or "all" to approve everything.',
                }),
            }),
            execute: async (_id, params) => {
                const workspaceDir = resolveWorkspaceDir();
                const inventory = scanCognitiveFiles(workspaceDir);
                if (inventory.error) {
                    return textResult(`❌ Could not scan workspace: ${inventory.error}`);
                }
                if (inventory.files.length === 0) {
                    return textResult('No cognitive files found in workspace. Nothing to approve.');
                }
                if (params.filename === 'all') {
                    // M7: Provide clear confirmation listing ALL approved files for auditability
                    for (const file of inventory.files) {
                        approveFile(workspaceDir, file.name, inventory, 'plugin');
                    }
                    const fileList = inventory.files.map(f => `  • ${f.name} (sha256: ${f.sha256.slice(0, 12)}…)`).join('\n');
                    return textResult(`✅ ALL ${inventory.files.length} cognitive file(s) approved into baseline:\n` +
                        fileList + '\n\n' +
                        `⚠️ Note: Approving all files marks them as trusted. ` +
                        `Future changes to any of these files will trigger drift alerts.`);
                }
                const match = inventory.files.find(f => f.name === params.filename);
                if (!match) {
                    return textResult(`❌ File "${params.filename}" not found in inventory. Available files:\n` +
                        inventory.files.map(f => `  • ${f.name}`).join('\n'));
                }
                approveFile(workspaceDir, params.filename, inventory, 'plugin');
                return textResult(`✅ Approved "${params.filename}" (sha256: ${match.sha256.slice(0, 12)}…) into baseline.`);
            },
        }), { names: ['clawvitals_approve_baseline'] });
        // ── clawvitals_set_cognitive_monitoring ──────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_set_cognitive_monitoring',
            label: 'ClawVitals: Set Cognitive File Monitoring',
            description: 'Include or exclude a cognitive file from drift detection. ' +
                'Included files are checked against their baseline on every scan — changes trigger a drift alert. ' +
                'Excluded files are still inventoried but never flagged for changes. ' +
                'Use filename="all" to apply the setting to all files in the inventory.',
            parameters: Type.Object({
                filename: Type.String({
                    description: 'Filename to update (e.g. "MEMORY.md") or "all" to apply to every file.',
                    minLength: 1,
                }),
                monitored: Type.Boolean({
                    description: 'true to include in drift detection, false to exclude.',
                }),
            }),
            execute: async (_id, params) => {
                const workspaceDir = resolveWorkspaceDir();
                const inventory = scanCognitiveFiles(workspaceDir);
                const existing = loadBaseline(workspaceDir);
                const now = new Date().toISOString();
                const filesToUpdate = params.filename === 'all'
                    ? inventory.files.map(f => f.name)
                    : [params.filename];
                const results = [];
                for (const name of filesToUpdate) {
                    const fileEntry = inventory.files.find(f => f.name === name);
                    if (!fileEntry) {
                        results.push(`  ⚠️ ${name} — not found in inventory`);
                        continue;
                    }
                    // Update or create baseline entry with excluded flag
                    const existingEntry = existing?.files.find(f => f.name === name);
                    const updatedEntry = {
                        name,
                        sha256: existingEntry?.sha256 ?? fileEntry.sha256,
                        size: existingEntry?.size ?? fileEntry.size,
                        approved_at: existingEntry?.approved_at ?? now,
                        approved_by: existingEntry?.approved_by ?? 'plugin',
                        excluded: !params.monitored,
                    };
                    const updatedFiles = [
                        ...(existing?.files.filter(f => f.name !== name) ?? []),
                        updatedEntry,
                    ];
                    const updatedBaseline = {
                        files: updatedFiles,
                        created_at: existing?.created_at ?? now,
                        last_checked_at: now,
                    };
                    saveBaseline(workspaceDir, updatedBaseline);
                    const action = params.monitored ? 'included in drift monitoring' : 'excluded from drift monitoring';
                    results.push(`  ${params.monitored ? '✅' : '—'} ${name} — ${action}`);
                }
                return textResult(`${pluginHeader()}\n\n` +
                    `📁 Cognitive file monitoring updated:\n` +
                    results.join('\n') +
                    `\n\nRun \`clawvitals status\` to see the current state.`);
            },
        }), { names: ['clawvitals_set_cognitive_monitoring'] });
        // ── clawvitals_export ────────────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_export',
            label: 'ClawVitals: Export Scan Report',
            description: 'Export the most recent ClawVitals scan report. Returns the report content ' +
                'in markdown format (default) or the directory path.',
            parameters: Type.Object({
                format: Type.Optional(Type.Union([
                    Type.Literal('markdown'),
                    Type.Literal('path'),
                ], {
                    description: 'Output format: "markdown" (default) returns report content, "path" returns directory path.',
                })),
            }),
            execute: async (_id, params) => {
                const workspaceDir = resolveWorkspaceDir();
                const format = params.format ?? 'markdown';
                const result = getLatestReport(workspaceDir, format);
                if (!result.found) {
                    return textResult(result.message ?? 'No scan history yet. Run clawvitals first.');
                }
                if (format === 'path') {
                    return textResult(`📁 Latest scan directory: ${result.path}`);
                }
                return textResult(result.content ?? '');
            },
        }), { names: ['clawvitals_export'] });
        // ── clawvitals_help ──────────────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_help',
            label: 'ClawVitals: Show Command Reference',
            description: 'Show the ClawVitals plugin command reference. Lists all scan commands, ' +
                'configuration commands, agent tools, and documentation links.',
            parameters: Type.Object({}),
            execute: async (_id, _params) => {
                return textResult(getHelpText());
            },
        }), { names: ['clawvitals_help'] });
        // ── clawvitals_scan ──────────────────────────────────────────────────
        api.registerTool(() => ({
            name: 'clawvitals_scan',
            label: 'ClawVitals: Run Security Scan',
            description: 'Run a ClawVitals security scan of this OpenClaw installation. ' +
                'Returns a scored report with pass/fail results for each control. ' +
                'Standard mode uses only the OpenClaw CLI — no additional filesystem or shell access. ' +
                'Expanded mode adds system-level checks (Ollama, open ports, Docker, disk encryption, OS updates, secrets in shell history, Cloudflare tunnel auth). ' +
                'Expanded mode reads additional files read-only to compute local findings only; no file contents are transmitted. ' +
                'Defaults to standard mode (OpenClaw CLI checks only).',
            parameters: Type.Object({
                mode: Type.Optional(Type.Union([
                    Type.Literal('standard'),
                    Type.Literal('expanded'),
                ], { description: 'Scan mode: "standard" (default, OpenClaw CLI checks only, no extra permissions) or "expanded" (adds system-level checks — reads additional files read-only, no file contents transmitted).' })),
                detailed: Type.Optional(Type.Boolean({
                    description: 'If true, returns full remediation details for each finding. Default true.',
                })),
            }),
            execute: async (_id, params) => {
                const workspaceDir = resolveWorkspaceDir();
                try {
                    const config = loadConfig();
                    const extra_ports = config.network?.extra_ports;
                    const mode = params.mode ?? 'standard';
                    const detailed = params.detailed ?? true;
                    const output = await runManualScan(workspaceDir, detailed, mode, extra_ports);
                    return textResult(output);
                }
                catch (err) {
                    return textResult(`${pluginHeader()}\n\n⚠️ Scan failed: ${err.message ?? 'unknown error'}`);
                }
            },
        }), { names: ['clawvitals_scan'] });
        // ── clawvitals_scheduled_scan (internal — called by cron) ────────────
        api.registerTool(() => ({
            name: 'clawvitals_scheduled_scan',
            label: 'ClawVitals: Run Scheduled Scan',
            description: 'Internal tool invoked by the ClawVitals cron job. Runs a scheduled scan and returns ' +
                'an alert message if regressions or new critical findings are detected, or a quiet ' +
                'confirmation if nothing changed. Not intended for direct user invocation.',
            parameters: Type.Object({}),
            execute: async (_id, _params) => {
                const workspaceDir = resolveWorkspaceDir();
                try {
                    const alertMessage = await runScheduledScan(workspaceDir);
                    if (alertMessage) {
                        return textResult(alertMessage);
                    }
                    return textResult(`${pluginHeader()}\n\n✅ Scheduled scan complete — no regressions or new issues.`);
                }
                catch (err) {
                    return textResult(`${pluginHeader()}\n\n⚠️ Scheduled scan failed: ${err.message ?? 'unknown error'}`);
                }
            },
        }), { names: ['clawvitals_scheduled_scan'] });
    },
};
export default clawvitalsPlugin;
//# sourceMappingURL=index.js.map