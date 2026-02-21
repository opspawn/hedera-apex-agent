#!/bin/bash
# W4 Workshop Stress Test — 3 sequential runs, all endpoints
# Tests 22 API endpoints + response times, flags anything >3s

BASE="https://hedera.opspawn.com"
RUN_NUM=$1
RESULTS_FILE="/tmp/w4-stress-run-${RUN_NUM}.json"

echo "========================================"
echo "  W4 STRESS TEST — RUN #${RUN_NUM}"
echo "  $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================"
echo ""

PASS=0
FAIL=0
SLOW=0
declare -a LATENCIES
declare -a RESULTS

test_endpoint() {
    local method="$1"
    local path="$2"
    local data="$3"
    local label="$4"
    local expected_code="$5"

    local start_ms=$(date +%s%N)

    if [ "$method" = "GET" ]; then
        local response=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /tmp/w4-response.txt "${BASE}${path}" 2>&1)
        local body=$(cat /tmp/w4-response.txt)
    else
        local response=$(curl -s -w "\n%{http_code}\n%{time_total}" -o /tmp/w4-response.txt -X POST \
            -H "Content-Type: application/json" \
            -d "$data" "${BASE}${path}" 2>&1)
        local body=$(cat /tmp/w4-response.txt)
    fi

    local end_ms=$(date +%s%N)

    # Parse http_code and time from response
    local http_code=$(echo "$response" | tail -2 | head -1)
    local time_total=$(echo "$response" | tail -1)
    local latency_ms=$(echo "$time_total * 1000" | bc 2>/dev/null || echo "0")

    # Check for pass/fail
    local status="PASS"
    local flag=""

    if [ "$http_code" != "$expected_code" ]; then
        status="FAIL"
        FAIL=$((FAIL + 1))
        flag=" [HTTP ${http_code}, expected ${expected_code}]"
    else
        PASS=$((PASS + 1))
    fi

    # Check latency
    local latency_int=$(echo "$latency_ms" | cut -d. -f1)
    if [ -n "$latency_int" ] && [ "$latency_int" -gt 3000 ] 2>/dev/null; then
        SLOW=$((SLOW + 1))
        flag="${flag} [SLOW: ${latency_ms}ms > 3000ms]"
    fi

    LATENCIES+=("$latency_ms")

    # Print result
    printf "  %-4s %-45s %3s  %7sms  %s%s\n" "$method" "$path" "$http_code" "${latency_ms%.*}" "$status" "$flag"

    # Brief content validation for key endpoints
    if [ "$label" = "health" ] && [ "$status" = "PASS" ]; then
        local ver=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version','?'))" 2>/dev/null)
        local std_count=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('standards',[])))" 2>/dev/null)
        local connected=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('testnet',{}).get('connected','?'))" 2>/dev/null)
        local registered=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('registryBroker',{}).get('registered','?'))" 2>/dev/null)
        echo "         version=${ver}, standards=${std_count}, testnet=${connected}, broker=${registered}"
    fi

    if [ "$label" = "agents" ] && [ "$status" = "PASS" ]; then
        local count=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('agents',[])))" 2>/dev/null)
        echo "         agent_count=${count}"
    fi

    if [ "$label" = "discover" ] && [ "$status" = "PASS" ]; then
        local source=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('source','?'))" 2>/dev/null)
        local count=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('agents',[])))" 2>/dev/null)
        echo "         source=${source}, discovered=${count}"
    fi

    if [ "$label" = "registry" ] && [ "$status" = "PASS" ]; then
        local reg=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('registered','?'))" 2>/dev/null)
        local uaid=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); u=d.get('uaid','?'); print(u[:30]+'...' if len(u)>30 else u)" 2>/dev/null)
        echo "         registered=${reg}, uaid=${uaid}"
    fi
}

echo "--- GET ENDPOINTS ---"
test_endpoint GET "/api/health" "" "health" "200"
test_endpoint GET "/api/agents" "" "agents" "200"
test_endpoint GET "/api/standards" "" "standards" "200"
test_endpoint GET "/api/skills" "" "skills" "200"
test_endpoint GET "/api/credits" "" "credits" "200"
test_endpoint GET "/api/points/leaderboard" "" "leaderboard" "200"
test_endpoint GET "/api/registry/status" "" "registry" "200"
test_endpoint GET "/api/privacy/policy" "" "privacy-policy" "200"
test_endpoint GET "/api/privacy/audit" "" "privacy-audit" "200"
test_endpoint GET "/api/chat/status" "" "chat-status" "200"
test_endpoint GET "/api/.well-known/agent-card.json" "" "agent-card" "200"
test_endpoint GET "/api/skills/search?q=security" "" "skills-search" "200"
test_endpoint GET "/api/marketplace/discover" "" "discover" "200"
test_endpoint GET "/api/marketplace/register" "" "register-info" "200"
test_endpoint GET "/api/register-agent" "" "register-cached" "200"

echo ""
echo "--- POST ENDPOINTS ---"

# POST: Register new agent (requires: name, description, skills[], endpoint)
test_endpoint POST "/api/marketplace/register" \
    '{"name":"StressTestBot-'${RUN_NUM}'","description":"Stress test agent run #'${RUN_NUM}'","skills":[{"name":"qa-testing","description":"Quality assurance","category":"testing"}],"endpoint":"https://example.com/agent-'${RUN_NUM}'"}' \
    "register-agent" "201"

# POST: Privacy consent FIRST (required before hiring; fields: user_id, agent_id, purposes[])
test_endpoint POST "/api/privacy/consent" \
    '{"user_id":"stress-tester-'${RUN_NUM}'","agent_id":"0.0.17717013755041","purposes":["service_delivery"],"data_types":["task_data"],"jurisdiction":"US"}' \
    "privacy-consent" "201"

# POST: Hire agent (requires consent first; fields: clientId, agentId, skillId)
test_endpoint POST "/api/marketplace/hire" \
    '{"clientId":"stress-tester-'${RUN_NUM}'","agentId":"0.0.17717013755041","skillId":"smart-contract-audit","input":{"contract_address":"0.0.5567890"}}' \
    "hire-agent" "200"

# POST: Chat (local mode)
test_endpoint POST "/api/chat" \
    '{"message":"discover agents","mode":"local"}' \
    "chat-local" "200"

# POST: Chat session
test_endpoint POST "/api/chat/session" \
    '{"agentId":"sentinel-ai","mode":"local"}' \
    "chat-session" "200"

# POST: Registry re-register
test_endpoint POST "/api/registry/register" \
    '{}' \
    "registry-register" "200"

# POST: Marketplace discover (POST mode)
test_endpoint POST "/api/marketplace/discover" \
    '{"query":"security","mode":"local"}' \
    "discover-post" "200"

echo ""
echo "--- SUMMARY RUN #${RUN_NUM} ---"
echo "  PASS: ${PASS}"
echo "  FAIL: ${FAIL}"
echo "  SLOW (>3s): ${SLOW}"
echo "  Total endpoints tested: $((PASS + FAIL))"

# Calculate latency stats
if [ ${#LATENCIES[@]} -gt 0 ]; then
    # Sort and compute
    sorted=($(for l in "${LATENCIES[@]}"; do echo "$l"; done | sort -n))
    min=${sorted[0]}
    max=${sorted[${#sorted[@]}-1]}

    sum=0
    for l in "${LATENCIES[@]}"; do
        val=$(echo "$l" | cut -d. -f1)
        sum=$((sum + val))
    done
    avg=$((sum / ${#LATENCIES[@]}))

    # P50 and P95
    p50_idx=$(( ${#sorted[@]} / 2 ))
    p95_idx=$(( ${#sorted[@]} * 95 / 100 ))
    p50=${sorted[$p50_idx]}
    p95=${sorted[$p95_idx]}

    echo "  Latency: min=${min%.*}ms, max=${max%.*}ms, avg=${avg}ms, p50=${p50%.*}ms, p95=${p95%.*}ms"
fi

echo "  Completed: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Return exit code
if [ $FAIL -gt 0 ]; then
    exit 1
else
    exit 0
fi
