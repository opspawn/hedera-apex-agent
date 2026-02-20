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
// NL Routing — extract structured intents from natural language
// ---------------------------------------------------------------------------

export interface NLIntent {
  type: 'search_agent' | 'search_skill' | 'price_filter' | 'category_filter' | 'agent_detail' | 'hire_intent' | 'unknown';
  query?: string;
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  agentName?: string;
}

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  'security': ['security', 'audit', 'vulnerability', 'scanning', 'pentest'],
  'translation': ['translation', 'translate', 'language', 'multilingual', 'localization'],
  'data analysis': ['data', 'analytics', 'analysis', 'etl', 'statistics', 'modeling'],
  'code review': ['code', 'review', 'code review', 'programming', 'development', 'software'],
  'content creation': ['content', 'creation', 'image', 'video', 'creative', 'generation', 'vision'],
  'ai assistant': ['assistant', 'automation', 'workflow', 'orchestration', 'document', 'qa'],
  'nlp': ['nlp', 'sentiment', 'text', 'language processing', 'extraction'],
  'blockchain': ['blockchain', 'defi', 'oracle', 'smart contract', 'on-chain', 'web3'],
};

/**
 * Parse natural language into a structured intent.
 */
export function parseNLIntent(message: string): NLIntent {
  const lower = message.toLowerCase().trim();

  // Price filter: "under X HBAR", "less than X", "cheaper than X", "below X HBAR"
  const priceMatch = lower.match(/(?:under|below|less than|cheaper than|max|maximum)\s+(\d+(?:\.\d+)?)\s*(?:hbar)?/);
  if (priceMatch) {
    return { type: 'price_filter', maxPrice: parseFloat(priceMatch[1]) };
  }
  // "above X HBAR", "more than X", "over X"
  const minPriceMatch = lower.match(/(?:above|over|more than|at least|minimum)\s+(\d+(?:\.\d+)?)\s*(?:hbar)?/);
  if (minPriceMatch) {
    return { type: 'price_filter', minPrice: parseFloat(minPriceMatch[1]) };
  }

  // Hire intent: "hire", "book", "engage", "use" + agent name
  const hireMatch = lower.match(/(?:hire|book|engage|use|employ)\s+(.+?)(?:\s+agent)?$/);
  if (hireMatch) {
    return { type: 'hire_intent', agentName: hireMatch[1].trim() };
  }

  // Category-based search: "find me a code review agent"
  for (const [cat, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    for (const syn of synonyms) {
      if (lower.includes(syn) && /(?:find|show|get|search|look|need|want|any)\b/.test(lower)) {
        return { type: 'category_filter', category: cat, query: syn };
      }
    }
  }

  // Generic agent search: "find me an agent for X"
  const findMatch = lower.match(/(?:find|show|get|search|look for|need)\s+(?:me\s+)?(?:an?\s+)?(?:agent|bot)s?\s+(?:for|that|which|to|about)\s+(.+)/);
  if (findMatch) {
    return { type: 'search_agent', query: findMatch[1].trim() };
  }

  // Agent detail lookup: "tell me about SentinelAI"
  const detailMatch = lower.match(/(?:tell me about|info on|details about|what is|who is)\s+(.+)/);
  if (detailMatch) {
    return { type: 'agent_detail', agentName: detailMatch[1].trim() };
  }

  return { type: 'unknown' };
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

  // --- NL Intent Routing (try structured parsing first) ---
  const nlResult = handleNLIntent(message, agents, ctx);
  if (nlResult) return nlResult;

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
      `- "Tell me about privacy compliance"\n` +
      `- "Find me a code review agent"\n` +
      `- "Show agents under 5 HBAR"\n\n` +
      `There are **${agents.length} agents** currently registered.`,
  };
}

// ---------------------------------------------------------------------------
// NL Intent Handler
// ---------------------------------------------------------------------------

function handleNLIntent(
  message: string,
  agents: RegisteredAgent[],
  ctx: MarketplaceContext | null,
): { response: string; agentId?: string } | null {
  const intent = parseNLIntent(message);
  if (intent.type === 'unknown') return null;

  // --- Price filter ---
  if (intent.type === 'price_filter') {
    const filtered = agents.filter(a =>
      a.skills.some(s => {
        if (intent.maxPrice !== undefined) return s.pricing.amount <= intent.maxPrice;
        if (intent.minPrice !== undefined) return s.pricing.amount >= intent.minPrice;
        return true;
      }),
    );
    if (filtered.length === 0) {
      const priceLabel = intent.maxPrice !== undefined
        ? `under ${intent.maxPrice} HBAR`
        : `above ${intent.minPrice} HBAR`;
      return { response: `No agents found with skills priced ${priceLabel}. Try adjusting your price range.` };
    }
    const label = intent.maxPrice !== undefined
      ? `under ${intent.maxPrice} HBAR`
      : `above ${intent.minPrice} HBAR`;
    const list = filtered.map(a => {
      const matchingSkills = a.skills.filter(s => {
        if (intent.maxPrice !== undefined) return s.pricing.amount <= intent.maxPrice;
        if (intent.minPrice !== undefined) return s.pricing.amount >= intent.minPrice;
        return true;
      });
      return `- **${a.name}**: ${matchingSkills.map(s => `${s.name} (${s.pricing.amount} HBAR)`).join(', ')}`;
    }).join('\n');
    return { response: `**${filtered.length} agents** with skills priced ${label}:\n\n${list}` };
  }

  // --- Category filter ---
  if (intent.type === 'category_filter' && intent.query) {
    const q = intent.query.toLowerCase();
    const filtered = agents.filter(a =>
      a.skills.some(s =>
        (s.category?.toLowerCase().includes(q)) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q)) ||
        s.name.toLowerCase().includes(q),
      ) ||
      a.description.toLowerCase().includes(q),
    );
    if (filtered.length === 0) {
      return { response: `No agents found for "${intent.category}". Currently ${agents.length} agents are registered across various categories.` };
    }
    const list = filtered.map(a => {
      const matchingSkills = a.skills.filter(s =>
        (s.category?.toLowerCase().includes(q)) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q)) ||
        s.name.toLowerCase().includes(q),
      );
      return `- **${a.name}** (Score: ${a.reputation_score}) — ${matchingSkills.map(s => s.name).join(', ')}\n  ${a.description.slice(0, 80)}...`;
    }).join('\n\n');
    return { response: `**${filtered.length} agents** matching "${intent.category}":\n\n${list}` };
  }

  // --- Search agent ---
  if (intent.type === 'search_agent' && intent.query && ctx) {
    const results = ctx.searchAgents(intent.query);
    if (results.length === 0) {
      return { response: `No agents found for "${intent.query}". Try different search terms or browse all agents with "list agents".` };
    }
    const list = results.map(a =>
      `- **${a.name}** (Score: ${a.reputation_score}) — ${a.skills.map(s => s.name).join(', ')}\n  ${a.description.slice(0, 80)}...`
    ).join('\n\n');
    return { response: `**${results.length} agents** found for "${intent.query}":\n\n${list}` };
  }

  // --- Agent detail ---
  if (intent.type === 'agent_detail' && intent.agentName && ctx) {
    const results = ctx.searchAgents(intent.agentName);
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
    return null; // Fall through to existing pattern matching
  }

  // --- Hire intent ---
  if (intent.type === 'hire_intent' && intent.agentName && ctx) {
    const results = ctx.searchAgents(intent.agentName);
    if (results.length > 0) {
      const agent = results[0];
      return {
        response: `To hire **${agent.name}**, follow these steps:\n\n` +
          `1. **Choose a skill:** ${agent.skills.map(s => `${s.name} (${s.pricing.amount} HBAR)`).join(', ')}\n` +
          `2. **Check privacy consent:** Send \`POST /api/privacy/consent\` with agent_id: \`${agent.agent_id}\`\n` +
          `3. **Hire:** Send \`POST /api/marketplace/hire\` with:\n` +
          `   \`\`\`json\n   {\n     "clientId": "your-id",\n     "agentId": "${agent.agent_id}",\n     "skillId": "${agent.skills[0]?.id || agent.skills[0]?.name}",\n     "input": { ... }\n   }\n   \`\`\`\n\n` +
          `All interactions are recorded on-chain via Hedera Consensus Service.`,
        agentId: agent.agent_id,
      };
    }
    return null; // Fall through
  }

  return null;
}
