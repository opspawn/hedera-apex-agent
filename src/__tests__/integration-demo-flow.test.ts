/**
 * Integration tests: End-to-end demo flow
 *
 * Sprint 32: Tests the full demo flow exercising API routes together:
 * agent listing → agent detail → chat session → message → credits → standards
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Shared mocks ---
const mockDiscoverAgents = vi.fn();
const mockGetAgentCount = vi.fn().mockReturnValue(8);
const mockSearchAgents = vi.fn();
const mockBrokerSearch = vi.fn();
const mockBrokerVectorSearch = vi.fn();
const mockBrokerCreateSession = vi.fn();
const mockBrokerSendMessage = vi.fn();
const mockRequestJson = vi.fn();
const mockPurchaseCreditsWithHbar = vi.fn();

const DEMO_AGENTS = [
  {
    agent: {
      agent_id: 'sentinel-1',
      name: 'SentinelAI',
      description: 'Smart contract security auditor',
      skills: [
        { name: 'Smart Contract Audit', category: 'security', pricing: { amount: 2, token: 'HBAR', unit: 'per_call' }, tags: ['security'] },
      ],
      reputation_score: 92,
      status: 'online',
      protocols: ['a2a-v0.3', 'hcs-10'],
      endpoint: 'https://sentinel.example.com/a2a',
      payment_address: '0.0.7854018',
    },
    verificationStatus: 'verified',
  },
  {
    agent: {
      agent_id: 'linguaflow-1',
      name: 'LinguaFlow',
      description: 'Multilingual translation',
      skills: [
        { name: 'Document Translation', category: 'translation', pricing: { amount: 0.3, token: 'HBAR', unit: 'per_call' }, tags: ['translation'] },
      ],
      reputation_score: 87,
      status: 'online',
      protocols: ['a2a-v0.3', 'hcs-10'],
      endpoint: 'https://lingua.example.com/a2a',
      payment_address: '0.0.7854018',
    },
    verificationStatus: 'verified',
  },
];

vi.mock('@/lib/server', () => ({
  getServerContext: vi.fn().mockImplementation(async () => ({
    marketplace: {
      discoverAgents: mockDiscoverAgents,
      getAgentCount: mockGetAgentCount,
    },
    registry: { getCount: vi.fn().mockReturnValue(0), searchAgents: mockSearchAgents },
    chatMarketplaceCtx: {
      getAgents: () => DEMO_AGENTS.map((d) => d.agent),
      getAgent: (id: string) => DEMO_AGENTS.find((d) => d.agent.agent_id === id)?.agent || null,
      searchAgents: (q: string) =>
        DEMO_AGENTS.map((d) => d.agent).filter(
          (a) => a.name.toLowerCase().includes(q.toLowerCase()) || a.description.toLowerCase().includes(q.toLowerCase()),
        ),
    },
    config: {
      hedera: { accountId: '0.0.7854018', network: 'testnet', privateKey: 'test-key' },
      topics: { registry: '0.0.7311321', inbound: '0.0.7854276', outbound: '0.0.7854275', profile: '0.0.7854282' },
    },
    testnetIntegration: {
      getStatus: () => ({
        mode: 'live',
        network: 'testnet',
        accountId: '0.0.7854018',
        topicsCreated: 3,
        messagesSubmitted: 15,
        connected: true,
      }),
    },
    hcs10: {
      createTopic: vi.fn().mockResolvedValue('0.0.99999'),
      sendMessage: vi.fn().mockResolvedValue({ sequenceNumber: 1 }),
    },
    startTime: Date.now() - 120000,
  })),
  getServerContextSync: vi.fn().mockReturnValue({
    config: {
      hedera: { accountId: '0.0.7854018', network: 'testnet', privateKey: 'test-key' },
      topics: { registry: '0.0.7311321', inbound: '0.0.7854276', outbound: '0.0.7854275', profile: '0.0.7854282' },
    },
    marketplace: { getAgentCount: () => 8 },
    registry: { getCount: () => 0 },
    testnetIntegration: {
      getStatus: () => ({
        mode: 'live',
        network: 'testnet',
        accountId: '0.0.7854018',
        topicsCreated: 3,
        messagesSubmitted: 15,
        connected: true,
      }),
    },
    startTime: Date.now() - 120000,
  }),
}));

vi.mock('@/lib/hol/rb-client', () => ({
  getClient: vi.fn().mockImplementation(async () => ({
    search: mockBrokerSearch,
    vectorSearch: mockBrokerVectorSearch,
    chat: {
      createSession: mockBrokerCreateSession,
      sendMessage: mockBrokerSendMessage,
    },
    requestJson: mockRequestJson,
    purchaseCreditsWithHbar: mockPurchaseCreditsWithHbar,
  })),
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('integration-uuid'),
}));

import { GET as discoverGET, POST as discoverPOST } from '@/app/api/marketplace/discover/route';
import { POST as chatPOST } from '@/app/api/chat/route';
import { GET as chatStatusGET } from '@/app/api/chat/status/route';
import { GET as creditsGET } from '@/app/api/credits/route';
import { GET as standardsGET } from '@/app/api/standards/route';
import { NextRequest } from 'next/server';

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'), options);
}

describe('Integration: Full Demo Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoverAgents.mockResolvedValue({ agents: DEMO_AGENTS, total: 2 });
    mockBrokerSearch.mockResolvedValue({
      hits: [
        {
          uaid: 'uaid-broker-1',
          name: 'BrokerAgent',
          description: 'Found via broker',
          endpoints: { primary: 'https://broker.example.com' },
          protocols: ['hcs-10'],
          capabilities: ['analysis'],
          trustScore: 75,
          registry: 'hashgraph-online',
          available: true,
        },
      ],
      total: 1,
    });
  });

  it('Step 1: Browse marketplace returns agents', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=agent&mode=hybrid&limit=50');
    const res = await discoverGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.source).toBe('hybrid');
    expect(data.agents.length).toBeGreaterThan(0);
    expect(data.localAgents.length).toBeGreaterThan(0);
    expect(data.total).toBeGreaterThan(0);
  });

  it('Step 2: View agent detail from local results', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=sentinel&mode=hybrid&limit=50');
    const res = await discoverGET(req);
    const data = await res.json();

    // local results include SentinelAI
    const localSentinel = data.localAgents?.find((a: any) => a.name === 'SentinelAI');
    expect(localSentinel).toBeDefined();
    expect(localSentinel.trust_score).toBe(92);
    expect(localSentinel.skills.length).toBeGreaterThan(0);
  });

  it('Step 3: Chat with agent in local mode', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'List all agents', mode: 'local' }),
    });
    const res = await chatPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('local');
    expect(data.response).toBeDefined();
    expect(data.response.length).toBeGreaterThan(0);
    expect(data.sessionId).toBeDefined();
  });

  it('Step 4: Chat session persists across messages', async () => {
    // First message
    const req1 = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
    });
    const res1 = await chatPOST(req1);
    const data1 = await res1.json();
    const sessionId = data1.sessionId;

    // Second message with same session
    const req2 = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'What skills are available?', sessionId }),
    });
    const res2 = await chatPOST(req2);
    const data2 = await res2.json();

    expect(data2.sessionId).toBe(sessionId);
    expect(data2.response).toBeDefined();
  });

  it('Step 5: Check standards compliance', async () => {
    const res = await standardsGET();
    const data = await res.json();

    expect(data.standards).toBeDefined();
    expect(data.standards).toHaveLength(6);
    expect(data.testnet).toBeDefined();
    expect(data.testnet.connected).toBe(true);
    expect(data.testnet.network).toBe('testnet');
    expect(data.agentCount).toBe(8);
  });

  it('Step 6: Check credits balance', async () => {
    mockRequestJson.mockResolvedValue({ credits: 50, tier: 'standard' });

    const req = makeRequest('http://localhost:3003/api/credits');
    const res = await creditsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.balance).toBeDefined();
    expect(data.accountId).toBeDefined();
  });

  it('Step 7: Chat status reports capabilities', async () => {
    const res = await chatStatusGET();
    const data = await res.json();

    expect(data.configured).toBe(true);
    expect(data.agentReady).toBe(true);
    expect(data.marketplaceAware).toBe(true);
    expect(data.modes).toContain('local');
    expect(data.modes).toContain('broker');
  });
});

describe('Integration: Broker Failure Graceful Degradation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoverAgents.mockResolvedValue({ agents: DEMO_AGENTS, total: 2 });
  });

  it('discover falls back to local when broker search throws', async () => {
    mockBrokerSearch.mockRejectedValue(new Error('ECONNREFUSED'));

    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=test&mode=hybrid');
    const res = await discoverGET(req);
    const data = await res.json();

    // Should still succeed with local results
    expect(res.status).toBe(200);
    expect(data.source).toBe('local');
    expect(data.agents.length).toBeGreaterThan(0);
  });

  it('discover returns brokerUnavailable flag in broker mode fallback', async () => {
    mockBrokerSearch.mockRejectedValue(new Error('Network timeout'));

    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=test&mode=broker');
    const res = await discoverGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.brokerUnavailable).toBe(true);
    expect(data.brokerError).toBe('Network timeout');
    expect(data.source).toBe('local');
  });

  it('vector search falls back to local when broker throws', async () => {
    mockBrokerVectorSearch.mockRejectedValue(new Error('Broker unavailable'));

    const req = makeRequest('http://localhost:3003/api/marketplace/discover', {
      method: 'POST',
      body: JSON.stringify({ query: 'security agent' }),
    });
    const res = await discoverPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.brokerUnavailable).toBe(true);
    expect(data.source).toBe('local');
    expect(data.agents.length).toBeGreaterThan(0);
  });

  it('chat broker mode falls back to local on failure', async () => {
    mockBrokerCreateSession.mockRejectedValue(new Error('Connection refused'));

    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        mode: 'broker',
        uaid: 'test-uaid',
        sessionId: 'fallback-session',
      }),
    });
    const res = await chatPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('local');
    expect(data.fallback).toBe(true);
    expect(data.response).toBeDefined();
  });

  it('credits falls back gracefully when broker is unreachable', async () => {
    mockRequestJson.mockRejectedValue(new Error('ECONNREFUSED'));

    const req = makeRequest('http://localhost:3003/api/credits');
    const res = await creditsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.source).toBe('fallback');
    expect(data.balance).toEqual({ credits: 0, available: true });
  });
});

describe('Integration: Standards Verification API', () => {
  it('returns all 6 standards with status', async () => {
    const res = await standardsGET();
    const data = await res.json();

    expect(data.standards).toHaveLength(6);
    const codes = data.standards.map((s: any) => s.code);
    expect(codes).toContain('HCS-10');
    expect(codes).toContain('HCS-11');
    expect(codes).toContain('HCS-14');
    expect(codes).toContain('HCS-19');
    expect(codes).toContain('HCS-20');
    expect(codes).toContain('HCS-26');
  });

  it('reports verified status for standards with on-chain activity', async () => {
    const res = await standardsGET();
    const data = await res.json();

    const hcs10 = data.standards.find((s: any) => s.code === 'HCS-10');
    expect(hcs10.status).toBe('verified');
    expect(hcs10.onChain).toBe(true);
    expect(hcs10.messageCount).toBeGreaterThan(0);
  });

  it('reports testnet connection status', async () => {
    const res = await standardsGET();
    const data = await res.json();

    expect(data.testnet.connected).toBe(true);
    expect(data.testnet.mode).toBe('live');
    expect(data.testnet.accountId).toBe('0.0.7854018');
  });

  it('reports agent count', async () => {
    const res = await standardsGET();
    const data = await res.json();

    expect(data.agentCount).toBe(8);
  });

  it('includes timestamp', async () => {
    const res = await standardsGET();
    const data = await res.json();

    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('reports topic IDs for relevant standards', async () => {
    const res = await standardsGET();
    const data = await res.json();

    const hcs10 = data.standards.find((s: any) => s.code === 'HCS-10');
    expect(hcs10.topicId).toBeDefined();
  });
});

describe('Integration: Search → Detail → Chat Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoverAgents.mockResolvedValue({ agents: DEMO_AGENTS, total: 2 });
    mockBrokerSearch.mockResolvedValue({ hits: [], total: 0 });
  });

  it('finds agent by search, gets details, starts chat', async () => {
    // 1. Search for agent
    const searchReq = makeRequest('http://localhost:3003/api/marketplace/discover?q=sentinel&mode=hybrid');
    const searchRes = await discoverGET(searchReq);
    const searchData = await searchRes.json();

    const agent = searchData.localAgents?.find((a: any) => a.name === 'SentinelAI');
    expect(agent).toBeDefined();

    // 2. Start chat referencing the agent
    const chatReq = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: `Tell me about ${agent.name}` }),
    });
    const chatRes = await chatPOST(chatReq);
    const chatData = await chatRes.json();

    expect(chatRes.status).toBe(200);
    expect(chatData.response).toBeDefined();
    expect(chatData.sessionId).toBeDefined();
  });

  it('local-only search works when broker returns empty', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=translation&mode=local');
    const res = await discoverGET(req);
    const data = await res.json();

    expect(data.source).toBe('local');
    expect(data.agents.length).toBeGreaterThan(0);
  });
});
