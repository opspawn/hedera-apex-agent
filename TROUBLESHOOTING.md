# W4 Live Demo Troubleshooting Guide

Quick reference for recovering from common failures during the live demo.

## API Endpoints Quick Check

```bash
# Health check — should return {"status":"ok"}
curl https://hedera.opspawn.com/api/health

# List agents — confirms seed data loaded
curl "https://hedera.opspawn.com/api/marketplace/discover?mode=local&limit=2"
```

## Common Failure Modes

### 1. "agent_not_found" (404) when hiring

**Cause**: Agent IDs regenerate on server restart (timestamp-based).

**Fix**: Re-discover agents first, copy the current `agent_id` from the response:
```bash
curl -s "https://hedera.opspawn.com/api/marketplace/discover?mode=local&limit=1" | jq '.agents[0].agent_id'
```
Use that ID in your hire call.

### 2. "consent_required" (403) when hiring

**Cause**: Privacy consent not granted for the client before hiring.

**Fix**: Grant consent first, then retry hire:
```bash
curl -X POST https://hedera.opspawn.com/api/privacy/consent \
  -H "Content-Type: application/json" \
  -d '{"user_id":"YOUR_CLIENT_ID","agent_id":"AGENT_ID","purposes":["service_delivery"]}'
```

**Shortcut**: Add `"skipConsent": true` to the hire body to bypass (for demo only).

### 3. Registry Broker timeout / empty broker results

**Cause**: HOL Registry Broker may be slow or down.

**Fix**: Force local mode by adding `?mode=local` to discover calls. Local always works — 8 seeded agents available immediately.

### 4. Server not responding / 502 from Cloudflare

**Fix**:
```bash
# Check if process is running
npx pm2 status hedera-apex

# Restart
npx pm2 restart hedera-apex

# Wait 5-8 seconds for Next.js to boot, then verify
curl https://hedera.opspawn.com/api/health
```

### 5. Duplicate consent (200 instead of 201)

**Not an error.** If consent already exists for a user+agent+purpose, the API returns the existing consent with `"existing": true` and HTTP 200. This is idempotent — safe to retry.

### 6. HBAR balance depleted (topic creation fails)

**Symptoms**: Hire succeeds but `task_topic` shows a fallback mock topic ID.

**Fix**: The demo still works — the hire flow completes, settlement record is created, and the response is valid. Topic creation failure is non-blocking.

## Demo Flow Cheat Sheet

1. **Discover** agents: `GET /api/marketplace/discover?mode=local`
2. **Grant consent**: `POST /api/privacy/consent` with user_id + agent_id
3. **Hire** agent: `POST /api/marketplace/hire` with clientId + agentId + skillId
4. **Check consent**: `GET /api/privacy/consent?userId=X&purpose=service_delivery`

## Error Response Format

All errors return consistent JSON:
```json
{
  "error": "error_code_or_message",
  "message": "Human-readable description",
  "details": "Optional technical details"
}
```

HTTP status codes: 400 (bad input), 403 (consent needed), 404 (not found), 409 (conflict), 500 (server error).
