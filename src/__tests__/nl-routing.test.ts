/**
 * Tests for NL (Natural Language) command routing in chat-server
 */
import { describe, it, expect } from 'vitest';
import { parseNLIntent, buildMarketplaceResponse, MarketplaceContext } from '@/lib/chat/chat-server';
import type { RegisteredAgent } from '@/lib/types';

// --- Fixtures ---

const securityAgent: RegisteredAgent = {
  agent_id: 'agent-sec-1',
  name: 'SentinelAI',
  description: 'Enterprise-grade security analysis agent',
  skills: [
    {
      id: 'smart-contract-audit',
      name: 'Smart Contract Audit',
      description: 'Deep analysis of smart contracts',
      category: 'blockchain',
      tags: ['security', 'audit', 'smart-contract'],
      input_schema: { type: 'object' },
      output_schema: { type: 'object' },
      pricing: { amount: 5, token: 'HBAR', unit: 'per_call' },
    },
  ],
  endpoint: 'https://sentinel-ai.opspawn.com/a2a',
  protocols: ['a2a-v0.3', 'hcs-10'],
  payment_address: '0.0.7854100',
  inbound_topic: '0.0.100',
  outbound_topic: '0.0.101',
  profile_topic: '0.0.102',
  reputation_score: 92,
  status: 'online',
  registered_at: '2026-01-01T00:00:00Z',
};

const codeAgent: RegisteredAgent = {
  agent_id: 'agent-code-1',
  name: 'CodeBot',
  description: 'Code review and development assistant',
  skills: [
    {
      id: 'code-review',
      name: 'Code Review',
      description: 'Automated code review',
      category: 'development',
      tags: ['code', 'review', 'development'],
      input_schema: { type: 'object' },
      output_schema: { type: 'object' },
      pricing: { amount: 2, token: 'HBAR', unit: 'per_call' },
    },
  ],
  endpoint: 'https://codebot.opspawn.com/a2a',
  protocols: ['a2a-v0.3', 'hcs-10'],
  payment_address: '0.0.7854101',
  inbound_topic: '0.0.200',
  outbound_topic: '0.0.201',
  profile_topic: '0.0.202',
  reputation_score: 85,
  status: 'online',
  registered_at: '2026-01-01T00:00:00Z',
};

const cheapAgent: RegisteredAgent = {
  agent_id: 'agent-cheap-1',
  name: 'BudgetBot',
  description: 'Affordable translation services',
  skills: [
    {
      id: 'translate',
      name: 'Translation',
      description: 'Text translation',
      category: 'nlp',
      tags: ['translation', 'language'],
      input_schema: { type: 'object' },
      output_schema: { type: 'object' },
      pricing: { amount: 0.5, token: 'HBAR', unit: 'per_call' },
    },
  ],
  endpoint: 'https://budgetbot.opspawn.com/a2a',
  protocols: ['a2a-v0.3'],
  payment_address: '0.0.7854102',
  inbound_topic: '0.0.300',
  outbound_topic: '0.0.301',
  profile_topic: '0.0.302',
  reputation_score: 70,
  status: 'online',
  registered_at: '2026-01-01T00:00:00Z',
};

const allAgents = [securityAgent, codeAgent, cheapAgent];

const mockCtx: MarketplaceContext = {
  getAgents: () => allAgents,
  getAgent: (id) => allAgents.find(a => a.agent_id === id) || null,
  searchAgents: (q) => {
    const lower = q.toLowerCase();
    return allAgents.filter(a =>
      a.name.toLowerCase().includes(lower) ||
      a.description.toLowerCase().includes(lower) ||
      a.skills.some(s =>
        s.name.toLowerCase().includes(lower) ||
        (s.tags || []).some(t => t.toLowerCase().includes(lower)),
      ),
    );
  },
};

// --- parseNLIntent tests ---

describe('parseNLIntent', () => {
  it('detects price filter: under X HBAR', () => {
    const intent = parseNLIntent('Show agents under 3 HBAR');
    expect(intent.type).toBe('price_filter');
    expect(intent.maxPrice).toBe(3);
  });

  it('detects price filter: below X', () => {
    const intent = parseNLIntent('find agents below 10');
    expect(intent.type).toBe('price_filter');
    expect(intent.maxPrice).toBe(10);
  });

  it('detects price filter: above X HBAR', () => {
    const intent = parseNLIntent('agents above 5 HBAR');
    expect(intent.type).toBe('price_filter');
    expect(intent.minPrice).toBe(5);
  });

  it('detects hire intent', () => {
    const intent = parseNLIntent('hire SentinelAI');
    expect(intent.type).toBe('hire_intent');
    expect(intent.agentName).toBe('sentinelai');
  });

  it('detects category filter: security', () => {
    const intent = parseNLIntent('find me a security agent');
    expect(intent.type).toBe('category_filter');
    expect(intent.category).toBe('security');
  });

  it('detects category filter: code review', () => {
    const intent = parseNLIntent('show code review agents');
    expect(intent.type).toBe('category_filter');
  });

  it('detects category filter: translation', () => {
    const intent = parseNLIntent('find translation agents');
    expect(intent.type).toBe('category_filter');
    expect(intent.category).toBe('translation');
  });

  it('detects category filter for "data" queries', () => {
    // "data analysis" matches the data/analytics category synonym
    const intent = parseNLIntent('find me an agent for data analysis');
    expect(intent.type).toBe('category_filter');
    expect(intent.category).toBe('data analysis');
  });

  it('detects agent detail: tell me about X', () => {
    const intent = parseNLIntent('tell me about SentinelAI');
    expect(intent.type).toBe('agent_detail');
    expect(intent.agentName).toBe('sentinelai');
  });

  it('returns unknown for unmatched messages', () => {
    const intent = parseNLIntent('hello');
    expect(intent.type).toBe('unknown');
  });

  it('handles decimal prices', () => {
    const intent = parseNLIntent('show agents under 2.5 HBAR');
    expect(intent.type).toBe('price_filter');
    expect(intent.maxPrice).toBe(2.5);
  });
});

// --- buildMarketplaceResponse NL routing tests ---

describe('buildMarketplaceResponse NL routing', () => {
  it('filters agents by max price', () => {
    const result = buildMarketplaceResponse('Show agents under 3 HBAR', mockCtx);
    expect(result.response).toContain('BudgetBot');
    expect(result.response).toContain('CodeBot');
    expect(result.response).not.toContain('SentinelAI');
  });

  it('filters agents by min price', () => {
    const result = buildMarketplaceResponse('agents above 4 HBAR', mockCtx);
    expect(result.response).toContain('SentinelAI');
    expect(result.response).not.toContain('BudgetBot');
  });

  it('shows no results for impossible price filter', () => {
    const result = buildMarketplaceResponse('Show agents under 0.01 HBAR', mockCtx);
    expect(result.response).toContain('No agents found');
  });

  it('finds agents by category: security', () => {
    const result = buildMarketplaceResponse('find me a security agent', mockCtx);
    expect(result.response).toContain('SentinelAI');
  });

  it('finds agents by category: translation', () => {
    const result = buildMarketplaceResponse('show translation agents', mockCtx);
    expect(result.response).toContain('BudgetBot');
  });

  it('handles hire intent with agent name', () => {
    const result = buildMarketplaceResponse('hire SentinelAI', mockCtx);
    expect(result.response).toContain('SentinelAI');
    expect(result.response).toContain('api/marketplace/hire');
    expect(result.agentId).toBe('agent-sec-1');
  });

  it('handles agent detail lookup', () => {
    const result = buildMarketplaceResponse('tell me about CodeBot', mockCtx);
    expect(result.response).toContain('CodeBot');
    expect(result.response).toContain('Code Review');
    expect(result.agentId).toBe('agent-code-1');
  });

  it('handles generic agent search', () => {
    const result = buildMarketplaceResponse('find me an agent for security', mockCtx);
    expect(result.response).toContain('SentinelAI');
  });

  it('falls back gracefully for NL with no matches', () => {
    // "find agent for quantum computing" triggers search_agent intent
    const result = buildMarketplaceResponse('find me an agent for quantum computing', mockCtx);
    expect(result.response).toContain('No agents found');
  });

  it('includes updated fallback suggestions', () => {
    const result = buildMarketplaceResponse('xyzzy', mockCtx);
    expect(result.response).toContain('Find me a code review agent');
    expect(result.response).toContain('Show agents under 5 HBAR');
  });
});
