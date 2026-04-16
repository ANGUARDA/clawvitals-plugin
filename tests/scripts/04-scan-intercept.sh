#!/usr/bin/env bash
# 04-scan-intercept.sh — Verify the plugin intercepts "run clawvitals" before the skill.
#
# Tests:
#   - "run clawvitals" response starts with "ClawVitals Plugin v..." header
#   - "show clawvitals details" response starts with "ClawVitals Plugin v..." header
#   - Output includes 📊 dashboard link
#   - When both skill and plugin installed, plugin wins
#
# Can run in CI: NO — requires live OpenClaw agent + messaging surface
set -euo pipefail

echo "04-scan-intercept.sh — Scan command intercept verification"
echo ""
echo "This test verifies the plugin intercepts scan commands before the skill."
echo "Both the ClawVitals skill (ClawHub) and plugin should be installed."
echo ""

cat <<'CHECKLIST'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SETUP: Ensure both skill and plugin are installed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  openclaw skills list   → should show clawvitals
  openclaw plugins list  → should show clawvitals plugin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST: "run clawvitals"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "run clawvitals"
Expected:
  [ ] First line of response is "ClawVitals Plugin v0.1.0 🔌" (NOT a skill response)
  [ ] Response contains score (e.g. "85/100")
  [ ] Response contains band emoji (🟢/🟡/🔴)
  [ ] Response ends with "📊 View your dashboard: https://clawvitals.io/dashboard"
  [ ] Response does NOT contain "This skill performs point-in-time checks only"
      (that's the skill's welcome message — plugin should not show it)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST: "clawvitals scan"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "clawvitals scan"
Expected:
  [ ] Same as above — plugin header present, dashboard link present

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST: "show clawvitals details"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "show clawvitals details"
Expected:
  [ ] First line is "ClawVitals Plugin v0.1.0 🔌"
  [ ] Response is longer than the summary (includes per-control detail)
  [ ] Each FAIL includes remediation steps
  [ ] Links to clawvitals.io/docs/nc-... per control

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST: Telemetry fired on scan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
After "run clawvitals":
  [ ] "clawvitals status" shows Total pings incremented by 1
  [ ] last_ping_at updated to ~now

CHECKLIST

echo ""
echo "If plugin is NOT intercepting (response lacks plugin header), check:"
echo "  1. Plugin is loaded: openclaw plugins list"
echo "  2. Plugin built: ls plugin/dist/index.js"
echo "  3. Gateway restarted after install: openclaw gateway restart"
