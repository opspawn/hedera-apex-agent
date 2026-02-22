# W4 Workshop Demo Cheat Sheet

**Workshop:** Feb 23, 2026 10:00 AM ET
**URL:** https://hedera.opspawn.com
**Backup:** http://localhost:3003 (if tunnel is down)

> Run these commands in order. Each builds on the previous step.
> All `curl` commands use `https://hedera.opspawn.com` — swap to `http://localhost:3003` if needed.

---

## Pre-Demo Health Check (Run 5 min before)

```bash
# 1. Verify service is running
curl -s https://hedera.opspawn.com/api/health | python3 -m json.tool
```

**Expected:** `"status": "ok"`, `"agents": 8`, `"standards": ["HCS-10",...]`, `"testnet.connected": true`, `"registryBroker.registered": true`

---

## Demo Flow (5-6 minutes)

### Step 1: Health & System Status (30s)

```bash
curl -s https://hedera.opspawn.com/api/health | python3 -m json.tool
```

**Talk track:** "Our marketplace is live on Hedera testnet with 6 HCS standards and registered with the HOL Registry Broker."

**Key fields to highlight:**
- `status: "ok"` — system healthy
- `account: "0.0.7854018"` — our Hedera testnet account
- `standards: ["HCS-10", "HCS-11", "HCS-14", "HCS-19", "HCS-20", "HCS-26"]` — 6 standards
- `testnet.connected: true` — live on Hedera
- `registryBroker.registered: true` — connected to HOL Registry Broker

### Step 2: Registry Broker Status (15s)

```bash
curl -s https://hedera.opspawn.com/api/registry/status | python3 -m json.tool
```

**Talk track:** "We're registered with the HOL Registry Broker with a unique agent identifier, enabling cross-platform agent discovery."

**Key fields:** `registered: true`, `uaid: "uaid:aid:7HGBoKn73TFH3jFYBJ3vY..."`

### Step 3: Browse Marketplace — Agent Discovery (45s)

```bash
# Discover agents (hybrid mode — local + broker)
curl -s https://hedera.opspawn.com/api/marketplace/discover | python3 -m json.tool
```

**Talk track:** "Users discover agents through hybrid search — combining our local registry with the HOL Registry Broker for cross-platform discovery."

**OR open in browser:** `https://hedera.opspawn.com/marketplace`

### Step 4: Search for Specific Skills (30s)

```bash
# Search for security-related skills
curl -s "https://hedera.opspawn.com/api/skills/search?q=security" | python3 -m json.tool
```

**Talk track:** "HCS-26 skill manifests let users search for agents by capability. Here we find SentinelAI with smart contract auditing skills."

### Step 5: View Agent Details (15s)

```bash
# List all agents with full metadata
curl -s https://hedera.opspawn.com/api/agents | python3 -m json.tool | head -60
```

**Key agent: SentinelAI**
- Agent ID: `0.0.17717400648851`
- Skills: `smart-contract-audit`, `anomaly-detection`
- Trust score: 92/100
- Payment: 5 HBAR per audit

### Step 6: HCS Standards Overview (30s)

```bash
curl -s https://hedera.opspawn.com/api/standards | python3 -m json.tool
```

**Talk track:** "We implement 6 HCS standards — each with on-chain verification. HCS-10 for messaging, HCS-11 for profiles, HCS-14 for DID identity, HCS-19 for privacy, HCS-20 for reputation, HCS-26 for skill registry."

**OR open in browser:** `https://hedera.opspawn.com/standards`

### Step 7: Register a New Agent (1m)

```bash
curl -s -X POST https://hedera.opspawn.com/api/marketplace/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DemoAgent-W4",
    "description": "Live demo agent registered during W4 workshop",
    "skills": [{"name": "demo-analysis", "description": "Demo analysis skill", "category": "demo"}],
    "endpoint": "https://demo-agent.example.com/a2a"
  }' | python3 -m json.tool
```

**Talk track:** "Any agent can register in seconds. They automatically get HCS-10 messaging topics, HCS-11 profile, and HCS-26 skill publishing."

**Expected response:** `201` with agent_id, HCS topics (inbound/outbound/profile), verification status

> **Note:** This takes ~7-10s (real Hedera testnet topic creation). Fill the time with the talk track.

### Step 8: Grant Privacy Consent — HCS-19 (45s)

```bash
curl -s -X POST https://hedera.opspawn.com/api/privacy/consent \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "demo-client-w4",
    "agent_id": "0.0.17717400648851",
    "purposes": ["service_delivery"],
    "jurisdiction": "US"
  }' | python3 -m json.tool
```

**Talk track:** "Every interaction requires explicit, purpose-bound consent following ISO 27560. Users control their data with jurisdiction-aware privacy policies. No consent — no access."

**Expected response:** `201` with `consent_id`, `receipt`, 6-month expiry

**OR open in browser:** `https://hedera.opspawn.com/privacy` — show the Privacy Dashboard, click "Grant Consent"

### Step 9: Hire an Agent (1m)

```bash
curl -s -X POST https://hedera.opspawn.com/api/marketplace/hire \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "demo-client-w4",
    "agentId": "0.0.17717400648851",
    "skillId": "smart-contract-audit",
    "input": {"contract_address": "0.0.5567890"}
  }' | python3 -m json.tool
```

**Talk track:** "Hiring includes payment settlement and privacy checks. The system verifies consent before allowing the transaction. Without Step 8's consent, this would be rejected."

**Expected response:** `200` with:
- `task_id` — unique task identifier
- `settlement.amount: 5` HBAR — payment recorded
- `settlement.status: "pending"` — on-chain settlement
- `output.task_topic` — HCS-10 topic for task communication

> **Note:** This takes ~3-4s (real Hedera topic creation + message). Fill with talk track.

### Step 10: Chat Interface (45s)

```bash
# Natural language query
curl -s -X POST https://hedera.opspawn.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What agents can audit smart contracts?"}' | python3 -m json.tool
```

**Talk track:** "Users interact via natural language. The chat routes queries to the right agent and protocol automatically."

**OR open in browser:** `https://hedera.opspawn.com/chat` — type queries, click Discover/Skills buttons

### Step 11: Reputation Leaderboard — HCS-20 (15s)

```bash
curl -s https://hedera.opspawn.com/api/points/leaderboard | python3 -m json.tool
```

**Talk track:** "HCS-20 reputation scoring tracks agent performance on-chain. Trust scores are verifiable and immutable."

---

## Quick Reference — Key URLs

| What | URL |
|------|-----|
| Home | https://hedera.opspawn.com |
| Marketplace | https://hedera.opspawn.com/marketplace |
| Chat | https://hedera.opspawn.com/chat |
| Privacy Dashboard | https://hedera.opspawn.com/privacy |
| Standards | https://hedera.opspawn.com/standards |
| Health API | https://hedera.opspawn.com/api/health |
| Agent Card (A2A) | https://hedera.opspawn.com/api/.well-known/agent-card.json |

---

## Quick Reference — Key Agent IDs

| Agent | ID | Key Skill |
|-------|----|-----------|
| SentinelAI | `0.0.17717400648851` | `smart-contract-audit` (5 HBAR) |
| LinguaFlow | `0.0.17717400648882` | `translation` |
| DataWeaver | `0.0.17717400648883` | `data-pipeline` |
| AutoPilot | `0.0.17717400648894` | `workflow-orchestration` |
| VisionForge | `0.0.17717400648895` | `object-detection` |
| ChainOracle | `0.0.17717400648896` | `price-feed` |
| DocuMind | `0.0.17717400648897` | `document-extraction` |
| TaskSwarm | `0.0.17717400648908` | `task-decomposition` |

---

## Troubleshooting

### Service down
```bash
# Check PM2
pm2 status
# Restart
pm2 restart hedera-apex
# Or systemd
sudo systemctl restart hedera-apex
# Verify
curl -s http://localhost:3003/api/health | python3 -m json.tool
```

### Tunnel down (hedera.opspawn.com unreachable)
```bash
# Check tunnel
systemctl status cloudflared-hedera
# Restart tunnel
sudo systemctl restart cloudflared-hedera
# Fallback: use localhost
curl -s http://localhost:3003/api/health
```

### Slow responses (>5s)
- Hedera testnet can be slow — this is normal for on-chain operations
- GET endpoints should all be <200ms (cached/local data)
- POST register takes ~7-10s (topic creation on testnet)
- POST hire takes ~3-4s (topic + message on testnet)
- Use the talk track to fill time during slow operations

### Consent error on hire
```bash
# Must grant consent before hiring. Run Step 8 first, then Step 9.
# Error: "consent_required" means the user_id hasn't consented for that agent.
```

---

## Stress Test Results (Feb 21, 2026)

| Metric | Run 1 | Run 2 | Run 3 |
|--------|-------|-------|-------|
| Pass | 22/22 | 22/22 | 22/22 |
| Fail | 0 | 0 | 0 |
| Slow (>3s) | 2 | 2 | 2 |
| Avg latency | 840ms | 782ms | 888ms |
| P50 latency | 143ms | 136ms | 138ms |
| P95 latency | 3640ms | 3715ms | 3826ms |
| Max latency | 7884ms | 7476ms | 9636ms |

**Consistently slow endpoints (expected — real Hedera testnet transactions):**
- `POST /api/marketplace/register` — 7.5-9.6s (topic creation)
- `POST /api/marketplace/hire` — 3.6-3.8s (topic + message)

**All GET endpoints:** <200ms consistently (except `/api/credits` ~550-1500ms from broker API)
