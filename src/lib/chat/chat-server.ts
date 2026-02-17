/**
 * Chat logic — marketplace-aware responder.
 *
 * Provides the buildMarketplaceResponse function used by Next.js API routes
 * to answer questions about agents, skills, hiring, and privacy
 * using data from the running marketplace without requiring external LLM API keys.
 */

import type { RegisteredAgent } from '../types';

// ---------------------------------------------------------------------------
// Marketplace context
// ---------------------------------------------------------------------------

export interface MarketplaceContext {
  getAgents: () => RegisteredAgent[];
  getAgent: (id: string) => RegisteredAgent | null;
  searchAgents: (q: string) => RegisteredAgent[];
}

// ---------------------------------------------------------------------------
// Session store (in-memory)
// ---------------------------------------------------------------------------

interface ChatSession {
  id: string;
  messages: Array<{ id: string; role: string; content: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
}

export const sessions = new Map<string, ChatSession>();

// ---------------------------------------------------------------------------
// Marketplace-aware local responder (works without external API keys)
// ---------------------------------------------------------------------------

export function buildMarketplaceResponse(message: string, ctx: MarketplaceContext | null): { response: string; agentId?: string; txId?: string } {
  const lower = message.toLowerCase().trim();
  const agents = ctx?.getAgents() ?? [];

  // --- Greeting ---
  if (/^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening))\b/.test(lower)) {
    return {
      response: `Hello! I'm the Hedera Agent Marketplace assistant. I can help you:\n\n` +
        `- **Discover agents** — search by name, skill, or category\n` +
        `- **Learn about skills** — see what each agent can do\n` +
        `- **Hire an agent** — understand the hiring process\n` +
        `- **Privacy & compliance** — learn about HCS-19 consent\n\n` +
        `There are currently **${agents.length} agents** registered. What would you like to know?`,
    };
  }

  // --- List all agents ---
  if (/\b(list|show|all|available)\b.*\b(agents?|bots?)\b/.test(lower) || /\b(agents?|bots?)\b.*\b(list|show|available|registered)\b/.test(lower) || lower === 'agents') {
    if (agents.length === 0) {
      return { response: 'No agents are currently registered in the marketplace. Try registering one via `POST /api/marketplace/register`.' };
    }
    const agentList = agents.map((a, i) =>
      `${i + 1}. **${a.name}** (${a.agent_id}) — ${a.description.slice(0, 100)}${a.description.length > 100 ? '...' : ''}\n   Skills: ${a.skills.map(s => s.name).join(', ')} | Reputation: ${a.reputation_score}/100 | Status: ${a.status}`
    ).join('\n\n');
    return {
      response: `**${agents.length} agents registered in the marketplace:**\n\n${agentList}`,
    };
  }

  // --- Search for a specific agent by name ---
  const agentNameMatch = lower.match(/\b(?:about|find|search|info|details|tell me about)\b.*?\b([a-z]+(?:\s[a-z]+)?)\b\s*(?:agent)?$/);
  if (agentNameMatch || /\b(search|find|discover)\b.*\b(agent|skill)\b/.test(lower)) {
    const searchTerms = lower
      .replace(/\b(about|find|search|info|details|tell|me|agent|agents|skill|skills|what|is|the|can|do|does)\b/g, '')
      .trim();
    if (searchTerms && ctx) {
      const results = ctx.searchAgents(searchTerms);
      if (results.length > 0) {
        const agent = results[0];
        const skillDetails = agent.skills.map(s =>
          `  - **${s.name}**: ${s.description || 'N/A'} (${s.pricing.amount} ${s.pricing.token}/${s.pricing.unit})`
        ).join('\n');
        return {
          response: `**${agent.name}** (${agent.agent_id})\n\n` +
            `${agent.description}\n\n` +
            `**Skills:**\n${skillDetails}\n\n` +
            `**Reputation:** ${agent.reputation_score}/100\n` +
            `**Status:** ${agent.status}\n` +
            `**Protocols:** ${agent.protocols.join(', ')}\n` +
            `**Endpoint:** ${agent.endpoint}`,
          agentId: agent.agent_id,
        };
      }
    }
  }

  // --- Skills query ---
  if (/\b(skills?|capabilities?|what can|abilities)\b/.test(lower)) {
    if (agents.length === 0) {
      return { response: 'No agents are registered yet, so no skills are available. Register agents to populate the skill registry.' };
    }
    const allSkills = agents.flatMap(a => a.skills.map(s => ({
      agentName: a.name,
      agentId: a.agent_id,
      ...s,
    })));
    const categories = Array.from(new Set(allSkills.map(s => s.category).filter((c): c is string => !!c)));
    const skillSummary = categories.map(cat => {
      const catSkills = allSkills.filter(s => s.category === cat);
      return `**${cat}** (${catSkills.length} skills):\n` +
        catSkills.map(s => `  - ${s.name} by ${s.agentName} — ${s.pricing.amount} ${s.pricing.token}/${s.pricing.unit}`).join('\n');
    }).join('\n\n');
    return {
      response: `**Available skills across ${agents.length} agents:**\n\n${skillSummary}\n\n` +
        `Total: ${allSkills.length} skills in ${categories.length} categories.`,
    };
  }

  // --- Privacy / compliance ---
  if (/\b(privacy|consent|compliance|gdpr|hcs-?19|data\s*protection)\b/.test(lower)) {
    return {
      response: `**Privacy & Compliance (HCS-19):**\n\n` +
        `The Hedera Agent Marketplace implements HCS-19 privacy compliance:\n\n` +
        `- **Consent Management** — Agents declare data processing purposes and users grant/revoke consent\n` +
        `- **Audit Trail** — All consent operations are recorded on Hedera Consensus Service topics\n` +
        `- **Data Rights** — Users can exercise access, rectification, erasure, and portability rights\n` +
        `- **Processing Records** — Every data processing operation is logged with purpose codes\n` +
        `- **Identity Verification** — Agent identities are verified via HCS-14 DID documents\n\n` +
        `Grant consent via \`POST /api/privacy/consent\` and check records at \`GET /api/privacy/consent/:id\`.\n\n` +
        `Currently **${agents.length} agents** are registered with verified identities.`,
    };
  }

  // --- How to hire ---
  if (/\b(hire|hiring|book|engage|employ)\b/.test(lower)) {
    return {
      response: `**How to hire an agent on the marketplace:**\n\n` +
        `1. **Discover** — Browse agents at \`GET /api/marketplace/discover\` or search by skill/category\n` +
        `2. **Review** — Check the agent's profile, reputation score, and HCS-19 privacy compliance\n` +
        `3. **Hire** — Send a hire request via \`POST /api/marketplace/hire\` with:\n` +
        `   \`\`\`json\n   {\n     "clientId": "your-id",\n     "agentId": "agent-id",\n     "skillId": "skill-name",\n     "input": { ... }\n   }\n   \`\`\`\n` +
        `4. **Verify** — The marketplace verifies the agent's HCS-19 identity before creating a task channel\n` +
        `5. **Execute** — A dedicated HCS-10 topic is created for task communication\n` +
        `6. **Payment** — Settlement is handled via HBAR on Hedera testnet\n\n` +
        `All interactions are recorded on-chain via Hedera Consensus Service.`,
    };
  }

  // --- HCS standards ---
  if (/\b(hcs|standards?|protocol|hedera\s+consensus)\b/.test(lower)) {
    return {
      response: `**Hedera Consensus Service Standards used in the marketplace:**\n\n` +
        `- **HCS-10** — Agent communication & messaging protocol\n` +
        `- **HCS-11** — Agent profile management\n` +
        `- **HCS-14** — Decentralized identity (DID) documents\n` +
        `- **HCS-19** — Privacy compliance & consent management\n` +
        `- **HCS-20** — Reputation points & leaderboard\n` +
        `- **HCS-26** — Decentralized skill registry\n\n` +
        `All data is anchored on Hedera testnet for transparency and immutability.`,
    };
  }

  // --- Help / what can you do ---
  if (/\b(help|what can you|how do|how to|guide|tutorial)\b/.test(lower)) {
    return {
      response: `I can help you with the following:\n\n` +
        `- **"List agents"** — Show all registered agents\n` +
        `- **"Search for [name]"** — Find a specific agent\n` +
        `- **"What skills are available?"** — Browse all skills by category\n` +
        `- **"How do I hire an agent?"** — Step-by-step hiring guide\n` +
        `- **"Tell me about privacy"** — HCS-19 compliance information\n` +
        `- **"What standards do you use?"** — HCS protocol overview\n\n` +
        `Currently **${agents.length} agents** are registered in the marketplace.`,
    };
  }

  // --- Default / fallback ---
  return {
    response: `I'm the Hedera Agent Marketplace assistant. I can help you discover agents, explore skills, understand the hiring process, and learn about privacy compliance.\n\n` +
      `Try asking:\n` +
      `- "List all available agents"\n` +
      `- "What skills are available?"\n` +
      `- "How do I hire an agent?"\n` +
      `- "Tell me about privacy compliance"\n\n` +
      `There are **${agents.length} agents** currently registered.`,
  };
}
