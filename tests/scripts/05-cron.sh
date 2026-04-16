#!/usr/bin/env bash
# 05-cron.sh — Test cron job registration and scheduled scan execution.
#
# Tests:
#   - clawvitals_set_schedule registers a cron job via openclaw cron
#   - "openclaw cron list" shows clawvitals:scheduled-scan
#   - Disabling schedule removes the cron job
#   - Scheduled scan can be manually triggered via "openclaw cron run"
#   - Triggered scan runs silently (no new findings = no message)
#   - Triggered scan alerts when regression simulated
#
# Can run in CI: PARTIAL — cron registration check can be automated (no messaging),
#                           triggered scan output requires messaging surface
set -euo pipefail

PASS=0; FAIL=0
ok() { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }
skip() { echo "  ⏭️  $1 (requires messaging surface)"; }

echo "05-cron.sh — Cron job registration and scheduled scan"
echo ""

# ── Part 1: Automated cron registration checks ────────────────────────────────
echo "[ Part 1 — Automated: cron registration via CLI ]"
echo "Send 'set clawvitals schedule cron 0 9 * * *' to your agent first, then run this script."
echo ""
echo "Checking openclaw cron list for clawvitals:scheduled-scan..."
echo ""

CRON_LIST=$(openclaw cron list 2>&1)

if echo "$CRON_LIST" | grep -q "clawvitals:scheduled-scan"; then
  ok "clawvitals:scheduled-scan appears in cron list"
else
  fail "clawvitals:scheduled-scan NOT found in cron list"
  echo "       (Have you sent 'set clawvitals schedule cron 0 9 * * *' to your agent?)"
fi

# ── Part 2: Manual triggered scan checks ─────────────────────────────────────
echo ""
echo "[ Part 2 — Manual: trigger scheduled scan ]"
echo ""

cat <<'CHECKLIST'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SETUP: Ensure schedule is registered (Part 1 must pass first)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEST: Silent scan (clean install — no new findings expected)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run: openclaw cron run clawvitals:scheduled-scan
Expected:
  [ ] OpenClaw delivers a message (scheduled scans DO message even on clean runs
      because before_agent_start returns prependContext for acknowledgement)
  [ ] Message contains "ClawVitals scheduled scan complete" OR an alert
  [ ] Does NOT show plugin header (cron scans don't use runManualScan)

TEST: Alert scan (introduce a regression first)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To simulate a regression, manually edit ~/.openclaw/workspace/clawvitals/last-success.json
to record a higher score than the current one, then run:
  openclaw cron run clawvitals:scheduled-scan
Expected:
  [ ] Alert message delivered to messaging surface
  [ ] Message contains "regression detected" or "new critical finding"
  [ ] Dashboard link https://clawvitals.io/dashboard present in alert

TEST: Disable schedule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "set clawvitals schedule enabled false"
Then: openclaw cron list
Expected:
  [ ] clawvitals:scheduled-scan is ABSENT from cron list (job removed)

CHECKLIST

echo ""
echo "Results (automated part): $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
