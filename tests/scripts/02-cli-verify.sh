#!/usr/bin/env bash
# 02-cli-verify.sh — Verify plugin manifest, build artefacts, and config schema.
#
# Tests:
#   - openclaw.plugin.json is valid JSON with required fields
#   - dist/index.js exports a default plugin object
#   - All declared tool names are present in compiled output
#   - Plugin version matches package.json
#
# Can run in CI: YES
set -euo pipefail

PLUGIN_PATH="${PLUGIN_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
PASS=0; FAIL=0

ok() { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "02-cli-verify.sh — Manifest and build verification"
echo ""

# ── Manifest fields ───────────────────────────────────────────────────────────
echo "[ openclaw.plugin.json ]"
MANIFEST="$PLUGIN_PATH/openclaw.plugin.json"
PKG="$PLUGIN_PATH/package.json"

MANIFEST_ID=$(python3 -c "import json,sys; print(json.load(open('$MANIFEST'))['id'])" 2>/dev/null)
MANIFEST_VER=$(python3 -c "import json,sys; print(json.load(open('$MANIFEST'))['version'])" 2>/dev/null)
PKG_VER=$(python3 -c "import json,sys; print(json.load(open('$PKG'))['version'])" 2>/dev/null)

[[ "$MANIFEST_ID" == "clawvitals" ]] && ok "manifest id = clawvitals" || fail "manifest id wrong: $MANIFEST_ID"
[[ -n "$MANIFEST_VER" ]] && ok "manifest has version: $MANIFEST_VER" || fail "manifest missing version"
[[ "$MANIFEST_VER" == "$PKG_VER" ]] && ok "manifest version matches package.json ($PKG_VER)" || fail "version mismatch: manifest=$MANIFEST_VER pkg=$PKG_VER"

# configSchema present
python3 -c "import json; m=json.load(open('$MANIFEST')); assert 'configSchema' in m" 2>/dev/null \
  && ok "configSchema present" || fail "configSchema missing from manifest"

# telemetry.enabled default=true
TELEM_DEFAULT=$(python3 -c "import json; m=json.load(open('$MANIFEST')); print(m['configSchema']['properties']['telemetry']['properties']['enabled']['default'])" 2>/dev/null)
[[ "$TELEM_DEFAULT" == "True" ]] && ok "telemetry.enabled defaults to true" || fail "telemetry.enabled default wrong: $TELEM_DEFAULT"

# ── Build artefacts ───────────────────────────────────────────────────────────
echo ""
echo "[ Build artefacts ]"
DIST="$PLUGIN_PATH/dist"

for f in index.js alerts.js alias.js intents.js scheduler.js telemetry.js plugin-config.js; do
  [[ -f "$DIST/$f" ]] && ok "$f compiled" || fail "$f missing from dist"
done

for subdir in collectors controls scoring reporting scheduling config; do
  [[ -d "$DIST/$subdir" ]] && ok "dist/$subdir/ present" || fail "dist/$subdir/ missing"
done

# ── Tool names in compiled output ─────────────────────────────────────────────
echo ""
echo "[ Tool names in dist/index.js ]"
TOOLS=(
  clawvitals_set_alias
  clawvitals_show_identity
  clawvitals_telemetry
  clawvitals_set_schedule
  clawvitals_status
  clawvitals_exclude
  clawvitals_exclusions
  clawvitals_trial_status
  clawvitals_upgrade
  clawvitals_configure_webhook
)

for tool in "${TOOLS[@]}"; do
  grep -q "$tool" "$DIST/index.js" && ok "$tool present" || fail "$tool missing from dist/index.js"
done

# ── Intent patterns ───────────────────────────────────────────────────────────
echo ""
echo "[ Intent patterns in dist/intents.js ]"
PATTERNS=("run clawvitals" "clawvitals scan" "show clawvitals details" "clawvitals full report")
for p in "${PATTERNS[@]}"; do
  grep -q "$p" "$DIST/intents.js" && ok "pattern '$p' present" || fail "pattern '$p' missing"
done

# ── CRON_JOB_NAME in compiled output ─────────────────────────────────────────
echo ""
echo "[ Cron job name ]"
grep -q "clawvitals:scheduled-scan" "$DIST/constants.js" \
  && ok "CRON_JOB_NAME present in constants.js" \
  || fail "CRON_JOB_NAME missing"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
