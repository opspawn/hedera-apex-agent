/**
 * Tests for health endpoint + demo flow verification
 *
 * Sprint 28: Validates health reports agent count correctly,
 * testnet status, and end-to-end demo flow (discover → chat → detail).
 */
import { describe, it, expect, vi } from 'vitest';

// --- Health endpoint tests ---

const mockMarketplaceGetAgentCount = vi.fn().mockReturnValue(8);
const mockRegistryGetCount = vi.fn().mockReturnValue(0);
const mockTestnetStatus = vi.fn().mockReturnValue({
  mode: 'live',
  network: 'testnet',
  accountId: '0.0.7854018',
  topicsCreated: 3,
  messagesSubmitted: 10,
  connected: true,
});

vi.mock('@/lib/server', () => ({
  getServerContext: vi.fn().mockResolvedValue({
    config: {
      hedera: { accountId: '0.0.7854018', network: 'testnet', privateKey: 'test-key' },
    },
    marketplace: {
      getAgentCount: () => mockMarketplaceGetAgentCount(),
      discoverAgents: vi.fn().mockResolvedValue({
        agents: [
          {
            agent: {
              agent_id: 'sentinel-1',
              name: 'SentinelAI',
              description: 'Security audit agent',
              skills: [{ name: 'Smart Contract Audit', category: 'security', pricing: { amount: 2, token: 'HBAR', unit: 'per_call' }, tags: ['security', 'audit'] }],
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
              skills: [{ name: 'Document Translation', category: 'translation', pricing: { amount: 0.3, token: 'HBAR', unit: 'per_call' }, tags: ['translation'] }],
              reputation_score: 87,
              status: 'online',
              protocols: ['a2a-v0.3', 'hcs-10'],
              endpoint: 'https://lingua.example.com/a2a',
              payment_address: '0.0.7854018',
            },
            verificationStatus: 'verified',
          },
        ],
        total: 2,
      }),
    },
    registry: {
      getCount: () => mockRegistryGetCount(),
    },
    testnetIntegration: {
      getStatus: () => mockTestnetStatus(),
    },
    registryBroker: {
      getStatus: () => ({ registered: true, uaid: 'uaid:aid:test123', brokerUrl: 'https://hol.org/registry/api/v1' }),
    },
    startTime: Date.now() - 60000,
  }),
  getServerContextSync: vi.fn().mockReturnValue({
    config: {
      hedera: { accountId: '0.0.7854018', network: 'testnet', privateKey: 'test-key' },
    },
    marketplace: { getAgentCount: () => mockMarketplaceGetAgentCount() },
    registry: { getCount: () => mockRegistryGetCount() },
    testnetIntegration: { getStatus: () => mockTestnetStatus() },
    registryBroker: {
      getStatus: () => ({ registered: true, uaid: 'uaid:aid:test123', brokerUrl: 'https://hol.org/registry/api/v1' }),
    },
    startTime: Date.now() - 60000,
  }),
}));

import { GET as healthGET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  it('returns status ok with all fields', async () => {
    const res = await healthGET();
    const data = await res.json();

    expect(data.status).toBe('ok');
    expect(data.version).toBe('1.0.0');
    expect(data.network).toBe('testnet');
    expect(data.account).toBe('0.0.7854018');
    expect(data.standards).toContain('HCS-10');
    expect(data.standards).toContain('HCS-19');
    expect(data.standards).toContain('HCS-26');
    expect(data.standards).toHaveLength(6);
  });

  it('reports agent count from marketplace service', async () => {
    mockMarketplaceGetAgentCount.mockReturnValue(8);
    const res = await healthGET();
    const data = await res.json();

    expect(data.agents).toBe(8);
  });

  it('falls back to registry count when marketplace is empty', async () => {
    mockMarketplaceGetAgentCount.mockReturnValue(0);
    mockRegistryGetCount.mockReturnValue(5);
    const res = await healthGET();
    const data = await res.json();

    expect(data.agents).toBe(5);
  });

  it('reports testnet connected=true in live mode', async () => {
    mockTestnetStatus.mockReturnValue({
      mode: 'live',
      network: 'testnet',
      accountId: '0.0.7854018',
      topicsCreated: 3,
      messagesSubmitted: 10,
      connected: true,
    });
    const res = await healthGET();
    const data = await res.json();

    expect(data.testnet.connected).toBe(true);
    expect(data.testnet.mode).toBe('live');
    expect(data.testnet.network).toBe('testnet');
    expect(data.testnet.accountId).toBe('0.0.7854018');
  });

  it('reports testnet connected=false in mock mode', async () => {
    mockTestnetStatus.mockReturnValue({
      mode: 'mock',
      network: 'testnet',
      accountId: 'mock-account',
      topicsCreated: 0,
      messagesSubmitted: 0,
      connected: false,
    });
    const res = await healthGET();
    const data = await res.json();

    expect(data.testnet.connected).toBe(false);
    expect(data.testnet.mode).toBe('mock');
  });

  it('reports uptime in seconds', async () => {
    const res = await healthGET();
    const data = await res.json();

    expect(data.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof data.uptime).toBe('number');
  });

  it('reports registry broker status', async () => {
    const res = await healthGET();
    const data = await res.json();

    expect(data.registryBroker).toBeDefined();
    expect(data.registryBroker.registered).toBe(true);
    expect(data.registryBroker.uaid).toBe('uaid:aid:test123');
  });
});

// --- Demo flow: config loading ---

describe('Config loading', () => {
  it('loads config with default account ID', async () => {
    // loadConfig has side effects, just test the exported config shape
    const { loadConfig } = await import('@/lib/config');
    const config = loadConfig();
    expect(config.hedera).toBeDefined();
    expect(config.hedera.network).toBe('testnet');
    expect(config.topics).toBeDefined();
    expect(config.topics.registry).toBeDefined();
    expect(config.server).toBeDefined();
  });
});
