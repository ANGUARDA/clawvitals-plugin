# ClawVitals Plugin — Manual Test Scripts

These scripts cover the runtime-dependent gaps that Jest cannot reach.
They require a live OpenClaw installation and (for some tests) an active
messaging surface (Slack, Signal, etc.).

## Why these can't be automated

| Gap | Reason |
|---|---|
| Plugin install/load | Requires `openclaw plugins install` + gateway restart |
| Tool execution | Requires OpenClaw agent runtime to invoke tool call protocol |
| `before_agent_start` hook | Requires live gateway session dispatch |
| Cron registration | Requires running `openclaw cron` CLI against live gateway |
| Cron firing a scan | Requires OpenClaw cron daemon + time passing |
| Telemetry → live Worker | Requires network + deployed `telemetry.clawvitals.io` |
| Dashboard shows data | Requires browser + `clawvitals-agent-api` Worker |

## Partial automation possible

Scripts 01 and 02 (install + CLI verification) can run in a headless CI
environment that has OpenClaw installed. Scripts 03–06 require a messaging
surface. Script 07 (telemetry) can be automated if the Worker is deployed.

See `run-all.sh` for the automated subset.

## Prerequisites

```bash
# OpenClaw installed and gateway running
openclaw --version
openclaw gateway status

# Plugin built
cd /path/to/clawvitals/plugin
npm run build

# PLUGIN_PATH set to the plugin directory
export PLUGIN_PATH="$(pwd)"
```

## Scripts

| Script | What it tests | Needs messaging |
|---|---|---|
| `01-install.sh` | Plugin installs, loads, shows in `plugins list` | No |
| `02-cli-verify.sh` | Plugin files, manifest, build artefacts valid | No |
| `03-tool-execution.sh` | All 10 tools respond correctly | Yes |
| `04-scan-intercept.sh` | "run clawvitals" routes to plugin (not skill) | Yes |
| `05-cron.sh` | Schedule set, cron job registered, scan fires | Yes |
| `06-exclusions.sh` | Add/list exclusions, EXCLUDED shows in scan | Yes |
| `07-telemetry.sh` | Telemetry ping reaches Worker, instance appears | No (network) |
| `08-e2e.sh` | Full end-to-end: install → scan → dashboard data | Yes + browser |
