# W4 Demo Fallback Plan

**Workshop**: Week 4, Feb 23 10AM ET (~57h from now)
**URL**: https://hedera.opspawn.com
**Service**: `hedera-apex.service` on port 3003

---

## 1. Testnet Slow or Unresponsive

**Symptom**: API calls to Hedera testnet hang or timeout (>5s).

**Fallback**:
- The app already runs in **dual mode** (live + local). If testnet calls timeout,
  responses automatically fall back to seed data.
- `/api/health` shows `testnet.mode: "live"` when connected. If it degrades,
  the app still functions using local agent registry.
- **Action**: No intervention needed. The fallback is automatic.
- **If total testnet outage**: Restart with `HEDERA_TESTNET_MODE=local` env var:
  ```bash
  sudo systemctl edit hedera-apex --runtime
  # Add: Environment=HEDERA_TESTNET_MODE=local
  sudo systemctl restart hedera-apex
  ```

## 2. Service Goes Down During Demo

**Symptom**: https://hedera.opspawn.com returns 502/503.

**Diagnosis & Recovery** (in order of speed):
1. **Quick restart** (~3s):
   ```bash
   sudo systemctl restart hedera-apex
   ```
2. **Check status**:
   ```bash
   systemctl status hedera-apex
   journalctl -u hedera-apex -n 50
   ```
3. **Port conflict** — something else grabbed port 3003:
   ```bash
   lsof -i :3003
   # Kill conflicting process, then restart
   ```
4. **Tunnel down** — app works locally but not externally:
   ```bash
   systemctl status cloudflared  # or check tunnel logs
   sudo systemctl restart cloudflared
   ```
5. **Nuclear option** — run dev server directly:
   ```bash
   cd /home/agent/projects/hedera-agent-marketplace-apex
   PORT=3003 npx next start &
   ```

**Recovery time**: Steps 1-2 take <5 seconds. Steps 3-5 take <30 seconds.

## 3. Registry Broker Unreachable

**Symptom**: `/api/health` shows `registryBroker.registered: false` or
discover/skills endpoints return broker errors.

**Fallback**:
- **Already implemented**: All broker-dependent endpoints have automatic
  fallback to local data. The response includes `source: "local"` when
  the broker is bypassed.
- Affected endpoints: `/api/marketplace/discover`, `/api/skills`, `/api/chat`
- **Action**: No intervention needed. Graceful degradation is built-in.
- **Demo note**: If broker is down, mention it as a feature:
  > "Notice the app gracefully degrades — when the Registry Broker is
  > unreachable, we fall back to local data while maintaining the same UX."

## 4. Chat AI Fails

**Symptom**: `/api/chat` returns empty or error responses.

**Fallback**:
- The chat system uses **local NL routing** — no external AI API dependency.
  It routes based on keyword matching and intent detection.
- If chat returns unexpected results, the 4 quick action buttons (Discover,
  Skills, Hire, Privacy) always produce deterministic, well-formatted responses.
- **Action**: Guide demo through quick action buttons if free-text input
  produces odd results.

## 5. Browser/Display Issues

**Symptom**: Styles broken, page doesn't render, JS errors.

**Fallback**:
- Hard refresh: Ctrl+Shift+R
- Try incognito window (clears cached assets)
- Fallback browser: If Chrome fails, use Firefox or vice versa
- **Last resort**: Demo via curl commands showing raw API responses

## 6. Pre-Demo Checklist (Run 30 min before)

```bash
# 1. Verify service is running
systemctl status hedera-apex

# 2. Test all pages
for p in / /marketplace /register /chat /standards /privacy; do
  echo "$p: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3003$p)"
done

# 3. Test health
curl -s http://localhost:3003/api/health | python3 -m json.tool

# 4. Test external access
curl -s -o /dev/null -w '%{http_code}' https://hedera.opspawn.com/

# 5. Test chat quick actions
curl -s -X POST http://localhost:3003/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"discover agents"}' | head -100
```

## 7. Key Numbers to Know

| Metric | Value |
|--------|-------|
| Agents registered | 8 |
| Skills available | 14 (5 categories) |
| HCS Standards | 6 (HCS-10, 11, 14, 19, 20, 26) |
| Test count | 400 (37 test files) |
| Service restart time | ~3 seconds |
| Registry Broker UAID | uaid:aid:7HGBoKn73TFH... |
| Hedera Account | 0.0.7854018 |
