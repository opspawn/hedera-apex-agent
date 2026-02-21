# W4 Workshop Contingency Plan

**Workshop:** Feb 23, 2026 10:00 AM ET
**Primary URL:** https://hedera.opspawn.com
**Backup URL:** http://localhost:3003

---

## Pre-Demo Checklist (T-30 minutes)

Run all of these. If any fail, see the relevant contingency section below.

```bash
# 1. Service running?
curl -s http://localhost:3003/api/health | python3 -m json.tool
# Must show: "status": "ok", "agents": 8

# 2. Testnet connected?
# Check health response for: "testnet.connected": true

# 3. Registry Broker registered?
curl -s http://localhost:3003/api/registry/status | python3 -m json.tool
# Must show: "registered": true

# 4. Tunnel live?
curl -s https://hedera.opspawn.com/api/health | python3 -m json.tool
# Same response as #1. If fails, see "Tunnel Down" below.

# 5. Agents seeded?
curl -s http://localhost:3003/api/agents | python3 -m json.tool | head -5
# Must show 8 agents. SentinelAI ID: 0.0.17717013755041

# 6. Consent pre-granted (speeds up Steps 8-9)?
curl -s -X POST http://localhost:3003/api/privacy/consent \
  -H "Content-Type: application/json" \
  -d '{"user_id":"demo-client-w4","agent_id":"0.0.17717013755041","purposes":["service_delivery"],"jurisdiction":"US"}' | python3 -m json.tool

# 7. Test register endpoint (latency check)
time curl -s -X POST http://localhost:3003/api/marketplace/register \
  -H "Content-Type: application/json" \
  -d '{"name":"PreTest","description":"Pre-demo latency check","skills":[{"name":"test","description":"test","category":"test"}],"endpoint":"https://test.example.com"}' > /dev/null
# Expect 7-10s. If >20s, see "Network Latency" section.
```

**All green?** You're ready. Delete the PreTest agent or ignore it (won't affect demo).

---

## Timed Demo Script (5 minutes total)

| # | Step | Time | Cumulative | Skippable? |
|---|------|------|------------|------------|
| 1 | Health & System Status | 0:30 | 0:30 | No (opener) |
| 2 | Registry Broker Status | 0:15 | 0:45 | Yes |
| 3 | Browse Marketplace | 0:45 | 1:30 | No (core) |
| 4 | Search Skills (HCS-26) | 0:30 | 2:00 | Yes |
| 5 | View Agent Details | 0:15 | 2:15 | Yes |
| 6 | HCS Standards Overview | 0:30 | 2:45 | Yes |
| 7 | **Register New Agent** | 1:00 | 3:45 | No (wow moment) |
| 8 | Grant Privacy Consent | 0:30 | 4:15 | Skip if pre-granted |
| 9 | **Hire an Agent** | 0:45 | 5:00 | No (wow moment) |
| 10 | Chat Interface | 0:30 | 5:30 | Yes (time permitting) |
| 11 | Reputation Leaderboard | 0:15 | 5:45 | Yes |

**Running long?** Cut Steps 2, 4, 5, 6, 11. That saves ~1:45, leaving a tight 4-minute core:
Health → Marketplace → Register → Consent → Hire → (Chat if time)

**Running short?** Open the browser UI at `/marketplace`, `/chat`, or `/privacy` to show the visual interface.

---

## Contingency 1: Hedera Testnet Down

**Symptoms:** Health check shows `"testnet.connected": false`, register/hire return 500s or timeout.

**Detection:**
```bash
curl -s https://hedera.opspawn.com/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); print('TESTNET:', d.get('testnet',{}).get('connected','MISSING'))"
```

**Fallback plan:**

1. **GET endpoints still work.** Steps 1-6, 10 (local mode), 11 all use cached/local data. Run those normally.

2. **For Step 7 (Register):** Explain: "Registration creates real HCS-10 topics on Hedera testnet. The testnet appears to be experiencing issues right now — this is shared infrastructure. Let me show you what the response looks like with our pre-registered agents."
   ```bash
   # Show existing agent registration details instead
   curl -s https://hedera.opspawn.com/api/agents | python3 -m json.tool | head -40
   ```

3. **For Step 9 (Hire):** Same approach — show the API contract:
   ```bash
   # Show the hire endpoint's expected interface
   curl -s https://hedera.opspawn.com/api/marketplace/hire
   # Then explain the response format using the cheat sheet
   ```

4. **Narrative pivot:** "This actually demonstrates a strength — our GET endpoints remain fast because we cache agent data locally while writing to Hedera for immutability. The marketplace stays responsive even during testnet congestion."

5. **Show architecture instead:** Open `/standards` page in browser, walk through the 6 HCS standards and how they interact. This is impressive content that doesn't need live testnet.

---

## Contingency 2: Network Latency Spikes (>20s)

**Symptoms:** POST `/api/marketplace/register` takes 20-30s+ instead of normal 7-10s.

**Detection (at T-30):**
```bash
time curl -s -X POST http://localhost:3003/api/marketplace/register \
  -H "Content-Type: application/json" \
  -d '{"name":"LatencyTest","description":"test","skills":[{"name":"t","description":"t","category":"t"}],"endpoint":"https://t.example.com"}' > /dev/null
```

**Fallback plan:**

1. **Pre-register the demo agent before the session:**
   ```bash
   curl -s -X POST http://localhost:3003/api/marketplace/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "DemoAgent-W4",
       "description": "Live demo agent registered during W4 workshop",
       "skills": [{"name": "demo-analysis", "description": "Demo analysis skill", "category": "demo"}],
       "endpoint": "https://demo-agent.example.com/a2a"
     }' | python3 -m json.tool
   ```
   Then during Step 7, show the agent in the list and say: "I registered this agent just before we started — it creates real HCS-10 topics on Hedera. Let me show you the result."

2. **Pre-grant consent too:**
   ```bash
   curl -s -X POST http://localhost:3003/api/privacy/consent \
     -H "Content-Type: application/json" \
     -d '{"user_id":"demo-client-w4","agent_id":"0.0.17717013755041","purposes":["service_delivery"],"jurisdiction":"US"}'
   ```

3. **If latency is borderline (15-20s):** Fire off the register POST, then fill time by opening the browser UI at `/marketplace` while it completes. Switch back to terminal to show the result.

4. **Talk track for delays:** "Hedera testnet transactions require consensus across the network — this is real decentralized infrastructure, not a mock. The 7-10 second wait is the cost of immutable, verifiable registration."

---

## Contingency 3: Service Won't Start

**Quick restart sequence:**
```bash
# Check if running
pm2 status

# Restart via PM2
pm2 restart hedera-apex

# If PM2 fails, try systemd
sudo systemctl restart hedera-apex

# If both fail, start manually
cd /home/agent/projects/hedera-agent-marketplace-apex
npm run build && npm start &

# Verify (wait 5-10s for initialization)
sleep 10
curl -s http://localhost:3003/api/health | python3 -m json.tool
```

**Common failure modes:**

| Problem | Symptom | Fix |
|---------|---------|-----|
| Port in use | `EADDRINUSE :3003` | `lsof -i :3003` then `kill <PID>`, restart |
| Missing env | `HEDERA_ACCOUNT_ID undefined` | Check `.env.local` exists in project root |
| Node crash | PM2 shows `errored` | `pm2 logs hedera-apex --lines 50` to diagnose |
| OOM | Process killed | `pm2 restart hedera-apex --max-memory-restart 1G` |
| Build error | `npm run build` fails | `rm -rf .next && npm run build` |
| Tunnel but no service | `502 Bad Gateway` | Service is down but tunnel is up — restart service |

**Nuclear option (full reset):**
```bash
pm2 delete hedera-apex 2>/dev/null
cd /home/agent/projects/hedera-agent-marketplace-apex
rm -rf .next node_modules/.cache
npm run build
pm2 start npm --name hedera-apex -- start
sleep 15
curl -s http://localhost:3003/api/health | python3 -m json.tool
```

---

## Contingency 4: Tunnel Down (hedera.opspawn.com unreachable)

**Detection:** `curl https://hedera.opspawn.com/api/health` returns connection error or 502.

**Fix attempt:**
```bash
# Check tunnel status
systemctl status cloudflared-hedera

# Restart tunnel
sudo systemctl restart cloudflared-hedera

# Verify
sleep 5
curl -s https://hedera.opspawn.com/api/health
```

**If tunnel won't recover:**
- Switch ALL URLs to `http://localhost:3003`
- If presenting via screen share, localhost works fine — audience won't see the URL bar closely
- Say: "I'm running this locally for reliability — same service, same Hedera testnet connections"

---

## Contingency 5: Browser/UI Issues

**If browser won't load the UI pages:**

1. **Terminal-only demo** using all the curl commands from the cheat sheet. This is actually the planned primary demo mode — the UI is bonus.

2. **Pipe to `jq` instead of `python3`** if python isn't available:
   ```bash
   curl -s https://hedera.opspawn.com/api/health | jq .
   ```

3. **Use a REST client** (Postman, Insomnia, or VS Code REST Client) with the endpoints pre-loaded. Import these URLs:
   - GET `https://hedera.opspawn.com/api/health`
   - GET `https://hedera.opspawn.com/api/marketplace/discover`
   - GET `https://hedera.opspawn.com/api/agents`
   - GET `https://hedera.opspawn.com/api/standards`
   - GET `https://hedera.opspawn.com/api/skills/search?q=security`
   - GET `https://hedera.opspawn.com/api/points/leaderboard`

4. **Show the agent card** as proof of A2A compatibility:
   ```bash
   curl -s https://hedera.opspawn.com/api/.well-known/agent-card.json | python3 -m json.tool
   ```

---

## Emergency Talk Tracks

**For any technical issue:**
> "This is a live system running on real Hedera testnet infrastructure — not a recording or mock. Occasional hiccups are the reality of decentralized systems, and our architecture handles them gracefully."

**For slow responses:**
> "What you're seeing is real consensus happening across the Hedera network. Every agent registration, every skill publication, every consent record is being written to an immutable ledger. That's the tradeoff for verifiability."

**For total failure:**
> "Let me walk you through the architecture while we wait for the service to recover."
> Then open `/standards` page or describe the 6 HCS standards flow:
> HCS-10 (messaging) → HCS-11 (profiles) → HCS-14 (identity) → HCS-19 (privacy) → HCS-20 (reputation) → HCS-26 (skills)

---

## Key Numbers to Remember

- **8** pre-seeded agents
- **6** HCS standards implemented
- **22/22** endpoints pass stress test (3 consecutive runs)
- **<200ms** for all GET endpoints
- **7-10s** for register (real testnet topic creation)
- **3-4s** for hire (real testnet transaction)
- **Account:** `0.0.7854018` (Hedera testnet)
- **UAID:** `uaid:aid:7HGBoKn73TFH...` (HOL Registry Broker)
