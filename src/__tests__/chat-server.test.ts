/**
 * Tests for the chat server logic (buildMarketplaceResponse)
 */
import { describe, it, expect } from 'vitest';
import { buildMarketplaceResponse, MarketplaceContext } from '@/lib/chat/chat-server';
import type { RegisteredAgent } from '@/lib/types';

const demoAgent: RegisteredAgent = {
  agent_id: 'agent-001',
  name: 'TestBot',
  description: 'A test agent for unit testing',
  skills: [
    {
      id: 'skill-1',
      name: 'Code Review',
      description: 'Reviews code for bugs',
      category: 'development',
      tags: ['code', 'review', 'testing'],
      input_schema: { type: 'object' },
      output_schema: { type: 'object' },
      pricing: { amount: 1, token: 'HBAR', unit: 'per_call' },
    },
  ],
  endpoint: 'https://test.example.com/a2a',
  protocols: ['hcs-10', 'a2a-v0.3'],
  payment_address: '0.0.12345',
  inbound_topic: '0.0.100',
  outbound_topic: '0.0.101',
  profile_topic: '0.0.102',
  reputation_score: 85,
  status: 'online',
  registered_at: '2026-01-01T00:00:00Z',
};

const mockCtx: MarketplaceContext = {
  getAgents: () => [demoAgent],
  getAgent: (id) => (id === demoAgent.agent_id ? demoAgent : null),
  searchAgents: (q) => {
    const lower = q.toLowerCase();
    if (demoAgent.name.toLowerCase().includes(lower) ||
        demoAgent.description.toLowerCase().includes(lower)) {
      return [demoAgent];
    }
    return [];
  },
};

const emptyCtx: MarketplaceContext = {
  getAgents: () => [],
  getAgent: () => null,
  searchAgents: () => [],
};

describe('buildMarketplaceResponse', () => {
  it('responds to greeting with agent count', () => {
    const result = buildMarketplaceResponse('Hello', mockCtx);
    expect(result.response).toContain('Hello');
    expect(result.response).toContain('1 agents');
  });

  it('responds to "hi" greeting', () => {
    const result = buildMarketplaceResponse('hi', mockCtx);
    expect(result.response).toContain('Hedera Agent Marketplace');
  });

  it('lists all agents when asked', () => {
    const result = buildMarketplaceResponse('list all agents', mockCtx);
    expect(result.response).toContain('TestBot');
    expect(result.response).toContain('agent-001');
    expect(result.response).toContain('1 agents registered');
  });

  it('shows "no agents" message when marketplace is empty', () => {
    const result = buildMarketplaceResponse('list agents', emptyCtx);
    expect(result.response).toContain('No agents');
  });

  it('responds to skills query', () => {
    const result = buildMarketplaceResponse('What skills are available?', mockCtx);
    expect(result.response).toContain('Code Review');
    expect(result.response).toContain('development');
  });

  it('responds to privacy query', () => {
    const result = buildMarketplaceResponse('Tell me about privacy', mockCtx);
    expect(result.response).toContain('HCS-19');
    expect(result.response).toContain('Consent Management');
  });

  it('responds to hire query', () => {
    const result = buildMarketplaceResponse('How do I hire an agent?', mockCtx);
    expect(result.response).toContain('Discover');
    expect(result.response).toContain('Hire');
    expect(result.response).toContain('/api/marketplace/hire');
  });

  it('responds to HCS standards query', () => {
    const result = buildMarketplaceResponse('What are the HCS standards?', mockCtx);
    expect(result.response).toContain('HCS-10');
    expect(result.response).toContain('HCS-26');
  });

  it('responds to help query', () => {
    const result = buildMarketplaceResponse('help', mockCtx);
    expect(result.response).toContain('List agents');
    expect(result.response).toContain('Search for');
  });

  it('provides fallback for unrecognized messages', () => {
    const result = buildMarketplaceResponse('xyzzy random gibberish', mockCtx);
    expect(result.response).toContain('Hedera Agent Marketplace assistant');
    expect(result.response).toContain('1 agents');
  });

  it('handles null context gracefully', () => {
    const result = buildMarketplaceResponse('Hello', null);
    expect(result.response).toContain('0 agents');
  });

  it('shows empty skills when no agents registered', () => {
    const result = buildMarketplaceResponse('skills', emptyCtx);
    expect(result.response).toContain('No agents are registered');
  });
});
