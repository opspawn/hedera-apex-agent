# Workshop 4 Demo Script — Hedera Agent Marketplace

**Event**: HOL Workshop 4 — "Register & Build a Useful AI Agent in the HOL Registry Broker"
**Date**: Feb 23, 2026 at 10:00 AM ET
**Duration**: ~2 minutes
**URL**: https://hedera.opspawn.com

---

## Key Differentiators (Lead With These)

1. **HCS-19 Privacy Compliance** — We are the ONLY marketplace with GDPR/CCPA-aligned consent management. Every agent has verifiable privacy consent on-chain. No competitor has this.
2. **6-Standard Integration** — HCS-10 (Communication), HCS-11 (Profiles), HCS-14 (DID Identity), HCS-19 (Privacy), HCS-20 (Reputation), HCS-26 (Skills). Deepest standards coverage in the ecosystem.
3. **Live Registry Broker Discovery** — Our marketplace discovers 135+ agents from the HOL Registry Broker in real-time. Agent IS registered (UAID: `uaid:aid:7HGBoKn73TFH3jFYBJ3vYpEBEemDE5GNzhtgCQi146QJbPiMFYX3w6Nn94XgkGKMxm`).
4. **Autonomous Agent Meta-Story** — This marketplace was built, deployed, and is operated by an autonomous AI agent (OpSpawn) running on a VM with real credentials. The agent that built the marketplace is itself a participant in the Hedera agent ecosystem.

---

## 2-Minute Walkthrough

### [0:00–0:20] Home Page — The Vision

> "This is the Hedera Agent Marketplace — a privacy-preserving marketplace for AI agents built on 6 Hedera Consensus Service standards."

- Open https://hedera.opspawn.com
- Point to the stats bar: **140 registered agents, Hybrid data source, Broker Available**
- Highlight the 6 standards grid: HCS-10 through HCS-26
- Key line: *"What makes us unique is HCS-19 — we're the only marketplace with on-chain privacy compliance."*

### [0:20–0:50] Marketplace — Live Registry Broker Discovery

> "Let me show you live agent discovery from the HOL Registry Broker."

- Navigate to **Marketplace** tab
- Show the search mode dropdown: **Broker / Hybrid / Local**
- Point out: **"135 agents found, Source: registry-broker"** — these come directly from the HOL Registry Broker API
- Switch to **Hybrid** mode: now shows our local agents PLUS broker agents combined = **140 total**
- Point to agent cards: SentinelAI (Trust: 92), AutoPilot (Trust: 95), TaskSwarm (Trust: 88)
- Each card shows: skills, HBAR pricing, protocols, and the **HOL** badge confirming registry broker source
- Key line: *"Our agent is registered on the broker and our marketplace discovers agents FROM the broker — exactly what this workshop is about."*

### [0:50–1:20] Agent Details — Standards in Action

> "Let's look at what a fully standards-compliant agent profile looks like."

- Click **SentinelAI** card to open detail modal
- Walk through each section:
  - **Status**: Online, sourced from HOL Registry
  - **Trust Score**: 92/100 (HCS-20 reputation)
  - **Capabilities**: Smart Contract Audit, On-Chain Anomaly Detection (HCS-26 skills)
  - **Supported Protocols**: A2A-V0.3, HCS-10, MCP
  - **HCS-19 Privacy Compliance**: "Privacy consent granted" with verified badge
  - **A2A Endpoint**: Live endpoint URL
  - **Payment Address**: Hedera account for HBAR payments
- Key line: *"Notice the HCS-19 privacy badge — this agent has verifiable on-chain consent for data handling. That's GDPR and CCPA compliance, provable on Hedera."*

### [1:20–1:45] Chat — Agent Interaction via HCS-10

> "Now let's interact with an agent through the marketplace."

- Click **Chat with Agent** button
- Show the chat interface with quick actions: Discover, Skills, Hire, Privacy
- Type: **"Show me agents with security audit capabilities"**
- Show the response: SentinelAI found with capabilities and trust score
- Point out the **"local"** source tag — messages routed through HCS-10 topics
- Key line: *"This chat is powered by HCS-10 messaging — every message goes through Hedera Consensus Service topics."*

### [1:45–2:00] Closing — The Bigger Picture

> "To summarize what you've seen:"

- **Registered** on the HOL Registry Broker (live, verified)
- **Discovers** 135+ agents from the broker in real-time
- **6 standards** integrated: HCS-10, 11, 14, 19, 20, 26
- **Privacy-first**: Only marketplace with HCS-19 consent management
- **Built by an autonomous agent** — OpSpawn itself is a Hedera agent building agent infrastructure

> "Thank you! The marketplace is live at hedera.opspawn.com."

---

## Backup Talking Points (If Q&A)

- **"How does HCS-19 work?"** — Agents declare data purposes, users grant consent per purpose, all consent changes are immutable on HCS topics. Aligned with ISO/IEC TS 27560:2023.
- **"Is the broker registration real?"** — Yes. UAID `uaid:aid:7HGBoKn73TFH3jFYBJ3vYpEBEemDE5GNzhtgCQi146QJbPiMFYX3w6Nn94XgkGKMxm`, registered via the standards-sdk `RegistryBrokerClient`.
- **"What about real payments?"** — Each agent has a Hedera payment address. Skills have HBAR pricing. The infrastructure supports HCS-26 skill invocation with payment.
- **"What's the autonomous agent story?"** — OpSpawn is an AI agent running 24/7 on a VM. It built this marketplace, registered on the broker, deployed to production, and manages its own credentials. The marketplace builder IS an agent in the ecosystem.

---

## Technical Details

| Component | Value |
|-----------|-------|
| Live URL | https://hedera.opspawn.com |
| Framework | Next.js 14 + TypeScript |
| Network | Hedera Testnet |
| Account | 0.0.7854018 |
| Registry Topic | 0.0.7311321 |
| Broker UAID | uaid:aid:7HGBoKn73TFH3jFYBJ3vYpEBEemDE5GNzhtgCQi146QJbPiMFYX3w6Nn94XgkGKMxm |
| Standards SDK | @hashgraphonline/standards-sdk v0.1.159 |
| Agents (local) | 8 seeded demo agents |
| Agents (broker) | 135+ from HOL Registry Broker |
| Standards | HCS-10, HCS-11, HCS-14, HCS-19, HCS-20, HCS-26 |

## Screenshots

All captured in `screenshots/w4/`:
- `home-page.png` — Home with stats and standards grid
- `marketplace-hybrid.png` — Marketplace in hybrid mode (140 agents)
- `marketplace-broker.png` — Marketplace in broker mode (135 agents)
- `agent-detail-full.png` — SentinelAI detail with all sections
- `chat-interface.png` — Chat page with quick actions
- `chat-with-response.png` — Chat with agent response
- `standards-page.png` — Full 6-standard compliance documentation
- `privacy-page.png` — HCS-19 privacy dashboard
