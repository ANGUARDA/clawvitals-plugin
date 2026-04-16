#!/usr/bin/env bash
# 01-install.sh — Verify plugin installs and loads correctly.
#
# Tests:
#   - openclaw plugins install --link <path> succeeds
#   - Plugin appears in openclaw plugins list
#   - Plugin status is "loaded" (not "error" or "disabled")
#   - No load errors in openclaw plugins doctor
#
# Can run in CI: YES (requires OpenClaw installed, no messaging surface needed)
set -euo pipefail

PLUGIN_PATH="${PLUGIN_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
PASS=0; FAIL=0

ok() { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "01-install.sh — Plugin install and load"
echo "Plugin path: $PLUGIN_PATH"
echo ""

# ── Build check ──────────────────────────────────────────────────────────────
echo "[ Build ]"
if [[ -f "$PLUGIN_PATH/dist/index.js" ]]; then
  ok "dist/index.js exists"
else
  fail "dist/index.js not found — run 'npm run build' first"
  exit 1
fi

if [[ -f "$PLUGIN_PATH/openclaw.plugin.json" ]]; then
  ok "openclaw.plugin.json present"
else
  fail "openclaw.plugin.json missing"
fi

# ── Install ───────────────────────────────────────────────────────────────────
echo ""
echo "[ Install ]"
if openclaw plugins install --link "$PLUGIN_PATH" 2>&1 | grep -q -i "error\|failed"; then
  fail "plugins install reported an error"
else
  ok "plugins install completed"
fi

# ── List ─────────────────────────────────────────────────────────────────────
echo ""
echo "[ Plugins list ]"
PLUGIN_LIST=$(openclaw plugins list 2>&1)

if echo "$PLUGIN_LIST" | grep -q "clawvitals"; then
  ok "clawvitals appears in plugins list"
else
  fail "clawvitals not found in plugins list"
fi

if echo "$PLUGIN_LIST" | grep -q "clawvitals" | grep -v "disabled\|error"; then
  ok "plugin is not in error/disabled state"
else
  # Check more carefully
  if echo "$PLUGIN_LIST" | grep "clawvitals" | grep -q "error"; then
    fail "plugin is in error state"
  elif echo "$PLUGIN_LIST" | grep "clawvitals" | grep -q "disabled"; then
    fail "plugin is disabled"
  else
    ok "plugin state appears healthy"
  fi
fi

# ── Doctor ───────────────────────────────────────────────────────────────────
echo ""
echo "[ Plugin doctor ]"
DOCTOR_OUT=$(openclaw plugins doctor 2>&1)
if echo "$DOCTOR_OUT" | grep -iq "clawvitals.*error\|clawvitals.*fail"; then
  fail "plugins doctor reports clawvitals error: $(echo "$DOCTOR_OUT" | grep -i clawvitals)"
else
  ok "no clawvitals errors in plugins doctor"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
