#!/usr/bin/env bash
# 08-e2e.sh — Full end-to-end smoke test checklist.
#
# Covers the complete user journey from plugin install through dashboard data.
# This script is a guided checklist — not automated. Run after all other scripts pass.
#
# Can run in CI: NO — requires browser for dashboard verification
set -euo pipefail

echo "08-e2e.sh — Full end-to-end smoke test"
echo ""
echo "Run each step in order. All prior scripts (01–07) should pass first."
echo ""

cat <<'CHECKLIST'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1: Fresh install
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [ ] cd /path/to/clawvitals/plugin && npm run build
  [ ] openclaw plugins install --link .
  [ ] openclaw plugins list → clawvitals shows loaded
  [ ] openclaw gateway restart (if needed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2: First scan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Send: "run clawvitals"
  [ ] Response starts with "ClawVitals Plugin v0.1.0 🔌"
  [ ] Score displayed (e.g. "82/100 🟡 Amber")
  [ ] Stable controls table present
  [ ] Dashboard link at end: https://clawvitals.io/dashboard
  [ ] "clawvitals status" shows Total pings: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3: Second scan (delta detection)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Send: "run clawvitals"
  [ ] Delta section present ("no new findings" or list of changes)
  [ ] "clawvitals status" shows Total pings: 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4: Schedule + cron
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Send: "set clawvitals schedule cron 0 9 * * *"
  [ ] Confirms schedule set
  Run: openclaw cron list
  [ ] clawvitals:scheduled-scan present
  Run: openclaw cron run clawvitals:scheduled-scan
  [ ] Scan completes (message delivered or silent on clean)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5: Telemetry and dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Check live Worker:
    curl "https://telemetry.clawvitals.io/ping?v=0.1.0&lv=1.0.0&s=82&b=amber&sf=2&sp=4&tr=3&sc=0&iid=<your-install-id>"
  [ ] Returns {"ok":true}

  Check dashboard (requires API_TOKEN):
    curl -H "Authorization: Bearer $API_TOKEN" https://clawvitals-agent-api.workers.dev/v1/instances
  [ ] Your install_id appears in instances list
  [ ] last_band and last_score match your most recent scan

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 6: Skill coexistence
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Ensure skill is also installed: openclaw skills list → clawvitals present
  Send: "run clawvitals"
  [ ] Plugin header appears (NOT skill's "Welcome to ClawVitals" message)
  [ ] Plugin won the intercept

CHECKLIST

echo ""
echo "All phases complete? The plugin is working end-to-end."
