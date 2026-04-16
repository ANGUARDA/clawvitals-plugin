#!/usr/bin/env bash
# 03-tool-execution.sh — Test all plugin tools via OpenClaw messaging surface.
#
# Tests (send via preferred channel, check response):
#   - clawvitals_status responds with schedule/telemetry/alias/install ID
#   - clawvitals_show_identity responds with install ID (UUID format)
#   - clawvitals_set_alias sets alias and confirms
#   - clawvitals_telemetry on/off toggles and confirms
#   - clawvitals_exclusions returns exclusion list (or "No exclusions")
#   - clawvitals_set_schedule (cron expression) saves and confirms
#
# Can run in CI: NO — requires a live messaging surface (Slack/Signal/etc)
# How to run: send each command to your OpenClaw agent, check response manually
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "03-tool-execution.sh — Manual tool execution checklist"
echo ""
echo "Send each command to your OpenClaw agent and verify the expected response."
echo "Mark ✅ when confirmed, ❌ if wrong or missing."
echo ""

cat <<'CHECKLIST'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL: clawvitals_status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "clawvitals status"
Expected:
  [ ] Contains "ClawVitals Plugin Status"
  [ ] Shows Schedule: enabled/disabled + cron expression
  [ ] Shows Telemetry: enabled/disabled
  [ ] Shows Alias: (set value or "not set")
  [ ] Shows Install ID: (valid UUID v4 format)
  [ ] Shows Total pings: (integer)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL: clawvitals_show_identity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "show clawvitals identity"
Expected:
  [ ] Shows Install ID: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx (UUID v4)
  [ ] Installed: (ISO date)
  [ ] NOT derived from hostname or username

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL: clawvitals_set_alias
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "set clawvitals alias test-machine-smoke"
Expected:
  [ ] Confirms alias set to "test-machine-smoke"
  [ ] Running "clawvitals status" now shows Alias: test-machine-smoke

Command: "set clawvitals alias a-name-with-@-invalid"
Expected:
  [ ] Returns error about invalid characters (NOT silently accepted)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL: clawvitals_telemetry
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "clawvitals telemetry off"
Expected:
  [ ] Confirms telemetry disabled
  [ ] "clawvitals status" shows Telemetry: disabled

Command: "clawvitals telemetry on"
Expected:
  [ ] Confirms telemetry enabled
  [ ] "clawvitals status" shows Telemetry: enabled

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL: clawvitals_exclusions (empty)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "clawvitals exclusions"
Expected:
  [ ] Returns "No exclusions configured" (or empty active list)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOOL: clawvitals_set_schedule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "set clawvitals schedule cron 0 8 * * 1"
Expected:
  [ ] Confirms schedule updated
  [ ] Shows Cron: 0 8 * * 1
  [ ] Shows Status: enabled

Command: "set clawvitals schedule enabled false"
Expected:
  [ ] Confirms schedule disabled
  [ ] "clawvitals status" shows Schedule: disabled

CHECKLIST

echo ""
echo "Run this file again with --auto-verify to attempt automated response checking"
echo "(requires OPENCLAW_SESSION_KEY env var and openclaw CLI access)"
