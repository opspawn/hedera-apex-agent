# W4 Workshop Demo Script — HOL Registry Broker Integration
**Date:** Feb 23, 2026 10:00 AM ET
**Duration:** ~5 minutes
**URL:** https://hedera.opspawn.com

---

## Step 1: Show Agent Registration on HCS-10 (registered=true)

**Navigate to:** `/api/health`

**What to show:**
- `registryBroker.registered: true` — our agent is live on the HOL Registry Broker
- `uaid: uaid:aid:7HGBoKn73TFH3...` — our unique agent identifier
- `standards: ["HCS-10", "HCS-11", "HCS-14", "HCS-19", "HCS-20", "HCS-26"]` — 6 standards
- `testnet.connected: true` with account `0.0.7854018`
- `agents: 8` — marketplace has 8 locally registered agents

**Talking point:** "Our marketplace is registered with the HOL Registry Broker and connected to Hedera Testnet. We implement six HCS standards — the deepest integration in the cohort."

---

## Step 2: Browse Marketplace (Agent Discovery via Registry Broker)

**Navigate to:** `/marketplace`

**What to show:**
- 135+ agents discovered via HOL Registry Broker in hybrid mode
- Search bar with mode selector: Hybrid / Broker / Local
- Agent cards showing name, description, trust scores, skills, protocols
- Source badges: `hashgraph-online` for broker agents, `HOL` for local
- Our curated agents (SentinelAI, AutoPilot, TaskSwarm) with rich metadata

**Demo action:** Type "security" in search — shows SentinelAI with Smart Contract Audit skill and 92/100 trust score

**Talking point:** "We combine HOL Registry Broker discovery with our own agent registry. Users see real agents from the broker plus our enriched local agents — all in one interface."

---

## Step 3: Chat with an Agent (Natural Language Interface)

**Navigate to:** `/chat`

**What to show:**
- Quick suggestion buttons: Discover, Skills, Hire, Privacy
- Three chat modes: Local, HCS-10, Broker
- Click "Discover" — shows all 8 agents with skills and reputation scores
- Type "Tell me about privacy compliance" — agent explains HCS-19
- Mode indicators showing which protocol is active

**Demo action:** Click "Discover" suggestion, then ask "What skills does SentinelAI have?"

**Talking point:** "Users interact via natural language. The chat routes queries to the right agent and protocol — local for marketplace questions, HCS-10 for direct agent messaging, or Broker relay for cross-platform communication."

---

## Step 4: Show Privacy Compliance (HCS-19 Consent Management)

**Navigate to:** `/privacy`

**What to show:**
- Privacy Dashboard with 4 tabs: Active Consents, Privacy Policies, Audit Trail, Grant Consent
- Standard badges: HCS-19, GDPR, CCPA, ISO 27560
- Privacy Policies tab: shows agent data handling policies with data categories, sharing rules, user rights
- Grant Consent tab: form for granting purpose-bound consent with jurisdiction selection
- Audit Trail tab: immutable record of all consent operations

**Demo action:** Click "Grant Consent" tab, fill form (user: demo-user, agent: agent-001, purposes: analytics,data_sharing, jurisdiction: EU), submit. Then switch to Audit Trail to show the immutable record.

**Talking point:** "Every data interaction is governed by HCS-19 consent. Users grant purpose-bound consent with jurisdiction awareness — GDPR for EU, CCPA for California. All operations are recorded on an immutable HCS audit trail."

---

## Step 5: Show Standards Integration Depth (10+ Standards)

**Navigate to:** `/standards`

**What to show:**
- Testnet Status Banner: Connected, account ID, topics created, messages submitted
- Architecture Overview: 6 standards as clickable badges with on-chain verification status
- Data Flow diagram: User -> Marketplace (HCS-11) -> Consent (HCS-19) -> Chat (HCS-10) -> Skills (HCS-26) -> Reputation (HCS-20)
- Each standard section with:
  - Verification badge (On-Chain Verified / Configured)
  - Topic IDs and on-chain message counts
  - 5-step Message Flow diagram
  - Implementation details
  - API endpoints

**Standards implemented:**
1. **HCS-10** — Agent Communication (topic-based messaging)
2. **HCS-11** — Agent Profiles (on-chain identity)
3. **HCS-14** — DID Identity (W3C decentralized identifiers)
4. **HCS-19** — Privacy & Consent (ISO 27560 compliant)
5. **HCS-20** — Reputation Points (on-chain scoring)
6. **HCS-26** — Skill Registry (capability manifests)
7. **ERC-8004** — Feedback system (rating and reviews)
8. **HOL Registry Broker** — Cross-protocol agent discovery
9. **A2A v0.3** — Agent-to-Agent protocol support
10. **MCP** — Model Context Protocol integration

**Talking point:** "We don't just check boxes — every standard is deeply integrated. HCS-11 profiles feed into HCS-10 messaging. HCS-19 consent gates data access. HCS-26 skills are discoverable through the Registry Broker. It's a complete privacy-preserving agent ecosystem on Hedera."

---

## Quick Recovery Notes

- **If health shows registered=false:** The server auto-registers on startup. Refresh the page or restart the Next.js process.
- **If broker agents don't load:** Switch to "Local" mode in marketplace — shows 8 demo agents with full data.
- **If chat is slow:** Use "Local" mode for instant responses. HCS-10 and Broker modes depend on network latency.
- **Live URL:** https://hedera.opspawn.com (Cloudflare tunnel → localhost:3003)
- **Testnet account:** 0.0.7854018

---

## Key Differentiators to Emphasize

1. **Deepest standards integration** — 6 HCS standards + ERC-8004 + HOL Broker + A2A + MCP
2. **Real Registry Broker connection** — not mocked, discovering real agents from the HOL index
3. **Privacy-first architecture** — HCS-19 consent required before data processing
4. **Natural language interface** — users don't need to understand protocols
5. **400 automated tests** — production quality, not a hackathon prototype
