/**
 * E2E Smoke Test Suite
 *
 * Sprint 34: Comprehensive smoke tests covering all main pages and API
 * endpoints for W4 workshop demo readiness. Verifies the full application
 * surface: health, agents, standards, skills, chat, registration, and
 * skill.json serving.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

// --- Shared mocks ---

const mockDiscoverAgents = vi.fn();
const mockGetAgentCount = vi.fn().mockReturnValue(8);
const mockSearchAgents = vi.fn();
const mockBrokerSearch = vi.fn();
const mockBrokerVectorSearch = vi.fn();
const mockBrokerCreateSession = vi.fn();
const mockBrokerSendMessage = vi.fn();
const mockRequestJson = vi.fn();
const mockBrokerListSkills = vi.fn();

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
      description: 'Multilingual translation agent',
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
    hcs26: {
      discoverSkills: vi.fn().mockResolvedValue({
        skills: [
          { name: 'Smart Contract Audit', category: 'security', pricing: { amount: 2, token: 'HBAR', unit: 'per_call' } },
        ],
        total: 1,
      }),
    },
    registryBroker: {
      getStatus: () => ({
        registered: true,
        uaid: 'uaid:aid:test123',
        brokerUrl: 'https://hol.org/registry/api/v1',
        lastCheck: new Date().toISOString(),
      }),
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
    registryBroker: {
      getStatus: () => ({
        registered: true,
        uaid: 'uaid:aid:test123',
        brokerUrl: 'https://hol.org/registry/api/v1',
        lastCheck: new Date().toISOString(),
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
    listSkills: mockBrokerListSkills,
    registerAgent: vi.fn().mockResolvedValue({ uaid: 'uaid:aid:new-agent', agentId: 'new-agent-1' }),
    waitForRegistrationCompletion: vi.fn(),
  })),
}));

vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('smoke-test-uuid'),
}));

// --- Imports ---
import { GET as healthGET } from '@/app/api/health/route';
import { GET as standardsGET } from '@/app/api/standards/route';
import { GET as discoverGET } from '@/app/api/marketplace/discover/route';
import { POST as chatPOST } from '@/app/api/chat/route';
import { GET as chatStatusGET } from '@/app/api/chat/status/route';
import { GET as creditsGET } from '@/app/api/credits/route';
import { GET as skillsGET } from '@/app/api/skills/search/route';
import { GET as registryStatusGET } from '@/app/api/registry/status/route';

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'), options);
}

// ============================================================
// E2E SMOKE TEST SUITE
// ============================================================

describe('E2E Smoke: Health Endpoint', () => {
  it('returns status ok with version, standards, and broker status', async () => {
    const res = await healthGET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.version).toBe('1.0.0');
    expect(data.network).toBe('testnet');
    expect(data.account).toBe('0.0.7854018');
    expect(data.standards).toHaveLength(6);
    expect(data.agents).toBeGreaterThan(0);
    expect(data.testnet).toBeDefined();
    expect(data.testnet.connected).toBe(true);
    expect(data.registryBroker).toBeDefined();
    expect(data.registryBroker.registered).toBe(true);
    expect(data.registryBroker.uaid).toBeDefined();
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });
});

describe('E2E Smoke: Standards Endpoint', () => {
  it('returns all 6 standards with testnet and broker info', async () => {
    const res = await standardsGET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.standards).toHaveLength(6);
    const codes = data.standards.map((s: any) => s.code);
    expect(codes).toEqual(['HCS-10', 'HCS-11', 'HCS-14', 'HCS-19', 'HCS-20', 'HCS-26']);

    // Each standard has required fields
    for (const s of data.standards) {
      expect(s.code).toBeDefined();
      expect(s.title).toBeDefined();
      expect(s.status).toBeDefined();
      expect(typeof s.onChain).toBe('boolean');
    }

    expect(data.testnet).toBeDefined();
    expect(data.registryBroker).toBeDefined();
    expect(data.registryBroker.registered).toBe(true);
    expect(data.timestamp).toBeDefined();
  });
});

describe('E2E Smoke: Agent Discovery', () => {
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

  it('hybrid mode returns both broker and local agents', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=agent&mode=hybrid&limit=50');
    const res = await discoverGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.source).toBe('hybrid');
    expect(data.agents).toBeDefined();
    expect(data.localAgents).toBeDefined();
    expect(data.total).toBeGreaterThan(0);
  });

  it('local mode returns local agents only', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=agent&mode=local');
    const res = await discoverGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.source).toBe('local');
    expect(data.agents.length).toBeGreaterThan(0);
  });

  it('agents have required display fields', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=agent&mode=local');
    const res = await discoverGET(req);
    const data = await res.json();

    for (const agent of data.agents) {
      expect(agent.agent_id).toBeDefined();
      expect(agent.name).toBeDefined();
      expect(typeof agent.name).toBe('string');
      expect(agent.description).toBeDefined();
    }
  });
});

describe('E2E Smoke: Skills Search (HCS-26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBrokerListSkills.mockResolvedValue({
      skills: [
        { name: 'Contract Audit', category: 'security', tags: ['audit'] },
      ],
    });
  });

  it('returns skills from broker and local', async () => {
    const req = makeRequest('http://localhost:3003/api/skills/search?q=audit&source=hybrid');
    const res = await skillsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.source).toBe('hybrid');
    expect(data.brokerSkills).toBeDefined();
    expect(data.localSkills).toBeDefined();
  });

  it('returns local skills when source=local', async () => {
    const req = makeRequest('http://localhost:3003/api/skills/search?q=audit&source=local');
    const res = await skillsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.source).toBe('local');
  });
});

describe('E2E Smoke: Chat System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoverAgents.mockResolvedValue({ agents: DEMO_AGENTS, total: 2 });
  });

  it('chat status endpoint reports ready', async () => {
    const res = await chatStatusGET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.configured).toBe(true);
    expect(data.agentReady).toBe(true);
    expect(data.marketplaceAware).toBe(true);
    expect(data.modes).toContain('local');
    expect(data.modes).toContain('broker');
  });

  it('local chat returns valid response with session', async () => {
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

  it('chat handles empty message gracefully', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: '' }),
    });
    const res = await chatPOST(req);

    // Should return 400 for empty message
    expect(res.status).toBe(400);
  });

  it('chat responds to agent discovery queries', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'What agents are available?' }),
    });
    const res = await chatPOST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.response).toBeDefined();
  });
});

describe('E2E Smoke: Credits Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns credits balance', async () => {
    mockRequestJson.mockResolvedValue({ credits: 100, tier: 'standard' });

    const req = makeRequest('http://localhost:3003/api/credits');
    const res = await creditsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.balance).toBeDefined();
    expect(data.accountId).toBeDefined();
  });

  it('falls back gracefully when broker unreachable', async () => {
    mockRequestJson.mockRejectedValue(new Error('ECONNREFUSED'));

    const req = makeRequest('http://localhost:3003/api/credits');
    const res = await creditsGET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.source).toBe('fallback');
    expect(data.balance).toBeDefined();
  });
});

describe('E2E Smoke: Registry Broker Status', () => {
  it('returns broker registration status', async () => {
    const res = await registryStatusGET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.registered).toBe(true);
    expect(data.uaid).toBeDefined();
    expect(data.brokerUrl).toBeDefined();
  });
});

describe('E2E Smoke: skill.json Verification', () => {
  it('skill.json exists in public directory', () => {
    const skillPath = path.resolve(__dirname, '../../public/skill.json');
    expect(fs.existsSync(skillPath)).toBe(true);
  });

  it('skill.json contains valid HCS-26 metadata', () => {
    const skillPath = path.resolve(__dirname, '../../public/skill.json');
    const content = fs.readFileSync(skillPath, 'utf-8');
    const skill = JSON.parse(content);

    // Required top-level fields
    expect(skill.name).toBeDefined();
    expect(skill.version).toBeDefined();
    expect(skill.description).toBeDefined();

    // Skill section
    expect(skill.skill).toBeDefined();
    expect(skill.skill.name).toBe('opspawn-agent-marketplace');
    expect(skill.skill.category).toBe('marketplace');
    expect(skill.skill.protocols).toContain('hcs-10');
    expect(skill.skill.protocols).toContain('hcs-26');

    // API section
    expect(skill.api).toBeDefined();
    expect(skill.api.endpoints).toBeDefined();
    expect(skill.api.endpoints.health).toBeDefined();
    expect(skill.api.endpoints.standards).toBeDefined();
    expect(skill.api.endpoints.skills_search).toBeDefined();

    // Registry section
    expect(skill.registry).toBeDefined();
    expect(skill.registry.uaid).toBeDefined();
    expect(skill.registry.network).toBe('testnet');
  });

  it('skill.json API base URL is correct', () => {
    const skillPath = path.resolve(__dirname, '../../public/skill.json');
    const skill = JSON.parse(fs.readFileSync(skillPath, 'utf-8'));

    expect(skill.api.base_url).toBe('https://hedera.opspawn.com/api');
  });
});

describe('E2E Smoke: Full Demo Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoverAgents.mockResolvedValue({ agents: DEMO_AGENTS, total: 2 });
    mockBrokerSearch.mockResolvedValue({ hits: [], total: 0 });
  });

  it('complete demo flow: health → discover → chat → standards', async () => {
    // Step 1: Health check
    const healthRes = await healthGET();
    const healthData = await healthRes.json();
    expect(healthData.status).toBe('ok');
    expect(healthData.agents).toBeGreaterThan(0);

    // Step 2: Discover agents
    const discoverReq = makeRequest('http://localhost:3003/api/marketplace/discover?q=agent&mode=hybrid');
    const discoverRes = await discoverGET(discoverReq);
    const discoverData = await discoverRes.json();
    expect(discoverData.agents).toBeDefined();

    // Step 3: Chat with marketplace
    const chatReq = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'List all agents' }),
    });
    const chatRes = await chatPOST(chatReq);
    const chatData = await chatRes.json();
    expect(chatData.response).toBeDefined();
    expect(chatData.sessionId).toBeDefined();

    // Step 4: Check standards
    const standardsRes = await standardsGET();
    const standardsData = await standardsRes.json();
    expect(standardsData.standards).toHaveLength(6);
    expect(standardsData.testnet.connected).toBe(true);
  });
});
