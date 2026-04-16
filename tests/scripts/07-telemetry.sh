#!/usr/bin/env bash
# 07-telemetry.sh — Verify telemetry pings reach the live Worker.
#
# Tests:
#   - GET /ping returns {"ok":true} with required params
#   - Invalid params return 400 with descriptive error
#   - Missing required param returns 400
#   - After a plugin scan, the instance appears in the agent API
#
# Can run in CI: YES (network required, no messaging surface needed)
set -euo pipefail

TELEMETRY_URL="https://telemetry.clawvitals.io/ping"
AGENT_API_URL="https://clawvitals-agent-api.workers.dev"
PASS=0; FAIL=0

ok() { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "07-telemetry.sh — Live telemetry Worker verification"
echo ""

# ── Valid ping ─────────────────────────────────────────────────────────────────
echo "[ Valid ping ]"
TEST_IID="00000000-0000-4000-8000-000000000099"
RESPONSE=$(curl -s "${TELEMETRY_URL}?v=0.1.0&lv=1.0.0&s=85&b=amber&sf=1&sp=5&tr=1&sc=0&iid=${TEST_IID}")
if echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('ok') else 1)" 2>/dev/null; then
  ok "Valid ping returns {ok:true}"
else
  fail "Valid ping failed: $RESPONSE"
fi

# ── With alias ────────────────────────────────────────────────────────────────
RESPONSE=$(curl -s "${TELEMETRY_URL}?v=0.1.0&lv=1.0.0&s=85&b=amber&sf=1&sp=5&tr=2&sc=0&iid=${TEST_IID}&alias=smoke-test")
if echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('ok') else 1)" 2>/dev/null; then
  ok "Ping with alias returns {ok:true}"
else
  fail "Ping with alias failed: $RESPONSE"
fi

# ── score=nd (insufficient_data) ─────────────────────────────────────────────
RESPONSE=$(curl -s "${TELEMETRY_URL}?v=0.1.0&lv=1.0.0&s=nd&b=amber&sf=0&sp=3&tr=3&sc=0&iid=${TEST_IID}")
if echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('ok') else 1)" 2>/dev/null; then
  ok "Ping with s=nd returns {ok:true}"
else
  fail "Ping with s=nd failed: $RESPONSE"
fi

# ── Scheduled scan ────────────────────────────────────────────────────────────
RESPONSE=$(curl -s "${TELEMETRY_URL}?v=0.1.0&lv=1.0.0&s=90&b=green&sf=0&sp=6&tr=4&sc=1&iid=${TEST_IID}")
if echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('ok') else 1)" 2>/dev/null; then
  ok "Scheduled scan ping (sc=1) returns {ok:true}"
else
  fail "Scheduled scan ping failed: $RESPONSE"
fi

# ── Invalid band ──────────────────────────────────────────────────────────────
echo ""
echo "[ Validation errors ]"
RESPONSE=$(curl -s "${TELEMETRY_URL}?v=0.1.0&lv=1.0.0&s=85&b=invalid&sf=1&sp=5&tr=1&sc=0&iid=${TEST_IID}")
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMETRY_URL}?v=0.1.0&lv=1.0.0&s=85&b=invalid&sf=1&sp=5&tr=1&sc=0&iid=${TEST_IID}")
if [[ "$HTTP_STATUS" == "400" ]]; then
  ok "Invalid band returns HTTP 400"
else
  fail "Invalid band returned HTTP $HTTP_STATUS (expected 400)"
fi

# ── Missing required param ────────────────────────────────────────────────────
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMETRY_URL}?v=0.1.0&s=85&b=amber")
if [[ "$HTTP_STATUS" == "400" ]]; then
  ok "Missing iid returns HTTP 400"
else
  fail "Missing iid returned HTTP $HTTP_STATUS (expected 400)"
fi

# ── Invalid UUID ──────────────────────────────────────────────────────────────
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TELEMETRY_URL}?v=0.1.0&lv=1.0.0&s=85&b=amber&sf=1&sp=5&tr=1&sc=0&iid=not-a-uuid")
if [[ "$HTTP_STATUS" == "400" ]]; then
  ok "Invalid UUID returns HTTP 400"
else
  fail "Invalid UUID returned HTTP $HTTP_STATUS (expected 400)"
fi

# ── POST rejected ─────────────────────────────────────────────────────────────
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${TELEMETRY_URL}")
if [[ "$HTTP_STATUS" == "405" ]]; then
  ok "POST to /ping returns HTTP 405 (Method Not Allowed)"
else
  fail "POST returned HTTP $HTTP_STATUS (expected 405)"
fi

# ── Agent API: instance appeared ──────────────────────────────────────────────
echo ""
echo "[ Agent API — instance record ]"
echo "(Requires API_TOKEN env var — skip if not available)"

if [[ -n "${API_TOKEN:-}" ]]; then
  INSTANCES=$(curl -s -H "Authorization: Bearer $API_TOKEN" "${AGENT_API_URL}/v1/instances")
  if echo "$INSTANCES" | python3 -c "
import json,sys
d=json.load(sys.stdin)
instances = d.get('instances', [])
match = [i for i in instances if i.get('id') == '${TEST_IID}']
sys.exit(0 if match else 1)
" 2>/dev/null; then
    ok "Smoke test instance $TEST_IID appears in agent API"
  else
    fail "Smoke test instance NOT found in agent API"
  fi
else
  echo "  ⏭️  Skipping agent API check (set API_TOKEN env var to enable)"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
