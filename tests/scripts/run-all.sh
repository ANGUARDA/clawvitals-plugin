#!/usr/bin/env bash
# run-all.sh — Run all automatable test scripts in sequence.
#
# Skips scripts that require a live messaging surface (03, 04, 06 partial, 08).
# Scripts 01, 02, 05 (partial), and 07 can run without a messaging surface.
#
# Usage:
#   ./run-all.sh                    # run automatable scripts only
#   ./run-all.sh --include-network  # also run 07-telemetry.sh (needs internet)
#   API_TOKEN=xxx ./run-all.sh      # include agent API check in 07
#
# CI usage:
#   Set PLUGIN_PATH to the plugin directory before running.
#   Set API_TOKEN if you want to verify the agent API.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLUGIN_PATH="${PLUGIN_PATH:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
INCLUDE_NETWORK="${1:-}"
TOTAL_PASS=0; TOTAL_FAIL=0

run_script() {
  local script="$1"
  local name="$(basename "$script")"
  echo ""
  echo "════════════════════════════════════════"
  echo "Running: $name"
  echo "════════════════════════════════════════"

  if PLUGIN_PATH="$PLUGIN_PATH" bash "$script"; then
    echo "  → $name PASSED"
    TOTAL_PASS=$((TOTAL_PASS+1))
  else
    echo "  → $name FAILED"
    TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi
}

echo "ClawVitals Plugin — Automated Test Runner"
echo "Plugin path: $PLUGIN_PATH"
echo ""

# ── Step 0: Run Jest unit + integration tests ─────────────────────────────────
echo "════════════════════════════════════════"
echo "Running: Jest test suite (npm test)"
echo "════════════════════════════════════════"
if (cd "$PLUGIN_PATH" && npm test 2>&1); then
  echo "  → Jest tests PASSED"
  TOTAL_PASS=$((TOTAL_PASS+1))
else
  echo "  → Jest tests FAILED"
  TOTAL_FAIL=$((TOTAL_FAIL+1))
fi

# ── Step 1: Build verification ────────────────────────────────────────────────
run_script "$SCRIPT_DIR/02-cli-verify.sh"

# ── Step 2: Install (if openclaw available) ───────────────────────────────────
if command -v openclaw &>/dev/null; then
  run_script "$SCRIPT_DIR/01-install.sh"

  # ── Step 3: Cron registration check (automated part only) ─────────────────
  # Only run if a cron job was previously registered (won't fail if not)
  echo ""
  echo "════════════════════════════════════════"
  echo "Running: 05-cron.sh (automated part)"
  echo "════════════════════════════════════════"
  if PLUGIN_PATH="$PLUGIN_PATH" bash "$SCRIPT_DIR/05-cron.sh" 2>&1; then
    echo "  → Cron check PASSED (or job not yet registered — see manual steps)"
    TOTAL_PASS=$((TOTAL_PASS+1))
  else
    echo "  → Cron check FAILED"
    TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi
else
  echo ""
  echo "  ⏭️  Skipping 01-install.sh and 05-cron.sh (openclaw not in PATH)"
fi

# ── Step 4: Telemetry Worker (if --include-network) ───────────────────────────
if [[ "$INCLUDE_NETWORK" == "--include-network" ]]; then
  run_script "$SCRIPT_DIR/07-telemetry.sh"
else
  echo ""
  echo "  ⏭️  Skipping 07-telemetry.sh (pass --include-network to include)"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo "TOTAL: $TOTAL_PASS passed, $TOTAL_FAIL failed"
echo "════════════════════════════════════════"
echo ""
echo "Scripts requiring messaging surface (run manually):"
echo "  03-tool-execution.sh  — all agent tools"
echo "  04-scan-intercept.sh  — plugin intercepts 'run clawvitals'"
echo "  06-exclusions.sh      — exclusion scan output"
echo "  08-e2e.sh             — full end-to-end"
echo ""
[[ $TOTAL_FAIL -eq 0 ]] && exit 0 || exit 1
