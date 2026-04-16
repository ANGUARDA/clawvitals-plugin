#!/usr/bin/env bash
# 06-exclusions.sh — Test exclusion management end-to-end.
#
# Tests:
#   - Adding an exclusion via agent tool persists to exclusions.json
#   - "clawvitals exclusions" lists the exclusion correctly
#   - Excluded control shows as EXCLUDED in scan report (not FAIL or PASS)
#   - Expired exclusion is shown as inactive
#
# Can run in CI: PARTIAL — filesystem checks automated, scan output requires messaging
set -euo pipefail

WORKSPACE="${HOME}/.openclaw/workspace"
EXCLUSIONS_FILE="${WORKSPACE}/clawvitals/exclusions.json"
PASS=0; FAIL=0

ok() { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "06-exclusions.sh — Exclusion management"
echo ""

# ── Part 1: Filesystem verification ──────────────────────────────────────────
echo "[ Part 1 — Automated: filesystem checks ]"
echo "Send 'clawvitals exclude NC-OC-009 reason smoke-test-exclusion' to your agent first."
echo ""

if [[ -f "$EXCLUSIONS_FILE" ]]; then
  ok "exclusions.json exists at $EXCLUSIONS_FILE"

  # Check file permissions (should be 600)
  PERMS=$(stat -f "%A" "$EXCLUSIONS_FILE" 2>/dev/null || stat -c "%a" "$EXCLUSIONS_FILE" 2>/dev/null)
  if [[ "$PERMS" == "600" ]]; then
    ok "exclusions.json has 600 permissions"
  else
    fail "exclusions.json permissions are $PERMS (expected 600)"
  fi

  # Check NC-OC-009 is in the file
  if python3 -c "
import json, sys
with open('$EXCLUSIONS_FILE') as f:
    exclusions = json.load(f)
match = [e for e in exclusions if e.get('controlId') == 'NC-OC-009']
if not match:
    sys.exit(1)
print('Found exclusion:', match[0].get('reason'))
" 2>/dev/null; then
    ok "NC-OC-009 exclusion found in exclusions.json"
  else
    fail "NC-OC-009 not found in exclusions.json (send the exclude command first)"
  fi

  # Check required fields
  python3 -c "
import json, sys
with open('$EXCLUSIONS_FILE') as f:
    exclusions = json.load(f)
for e in exclusions:
    required = ['controlId', 'reason', 'created_at']
    missing = [f for f in required if f not in e]
    if missing:
        print(f'Exclusion missing fields: {missing}')
        sys.exit(1)
print('All exclusions have required fields')
" 2>/dev/null && ok "All required fields present (controlId, reason, created_at)" \
  || fail "Some exclusions missing required fields"

else
  fail "exclusions.json not found — send the exclude command first"
fi

# ── Part 2: Manual scan output checks ────────────────────────────────────────
echo ""
echo "[ Part 2 — Manual: scan output with exclusion active ]"
echo ""

cat <<'CHECKLIST'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SETUP: NC-OC-009 exclusion must be active (Part 1 must pass)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TEST: Excluded control shown in scan report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "show clawvitals details"
Expected:
  [ ] NC-OC-009 shows as EXCLUDED (not PASS or INFO)
  [ ] Exclusion reason shown: "smoke-test-exclusion"
  [ ] Score is NOT affected by the exclusion (EXCLUDED ≠ FAIL, doesn't deduct)

TEST: Expired exclusion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Command: "clawvitals exclude NC-OC-003 reason past-expiry expires 2020-01-01"
Then: "clawvitals exclusions"
Expected:
  [ ] Shows NC-OC-003 in "Expired" section (not Active)
  [ ] Running "run clawvitals" does NOT suppress NC-OC-003 (expired exclusion ignored)

TEST: Clean up
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Manually remove test exclusions from:
  ~/.openclaw/workspace/clawvitals/exclusions.json

CHECKLIST

echo ""
echo "Results (automated part): $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
