/**
 * Tests for GET /api/standards
 *
 * Sprint 32: Verifies the standards verification API
 * returns correct on-chain status data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetStatus, mockGetAgentCount } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockGetAgentCount: vi.fn(),
}));

vi.mock('@/lib/server', () => ({
  getServerContext: vi.fn().mockImplementation(async () => ({
    config: {
      hedera: { accountId: '0.0.7854018', network: 'testnet', privateKey: 'test-key' },
      topics: { registry: '0.0.7311321', inbound: '0.0.7854276', outbound: '0.0.7854275', profile: '0.0.7854282' },
    },
    marketplace: { getAgentCount: mockGetAgentCount },
    testnetIntegration: { getStatus: mockGetStatus },
  })),
  getServerContextSync: vi.fn().mockReturnValue({
    config: {
      hedera: { accountId: '0.0.7854018', network: 'testnet', privateKey: 'test-key' },
      topics: { registry: '0.0.7311321', inbound: '0.0.7854276', outbound: '0.0.7854275', profile: '0.0.7854282' },
    },
    marketplace: { getAgentCount: mockGetAgentCount },
    testnetIntegration: { getStatus: mockGetStatus },
  }),
}));

import { GET } from '@/app/api/standards/route';

describe('GET /api/standards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 6 standards when connected with agents', async () => {
    mockGetStatus.mockReturnValue({
      mode: 'live', network: 'testnet', accountId: '0.0.7854018',
      topicsCreated: 5, messagesSubmitted: 20, connected: true,
    });
    mockGetAgentCount.mockReturnValue(8);

    const res = await GET();
    const data = await res.json();

    expect(data.standards).toHaveLength(6);
    expect(data.agentCount).toBe(8);
    expect(data.testnet.connected).toBe(true);
  });

  it('marks HCS-10 as verified when messages are submitted', async () => {
    mockGetStatus.mockReturnValue({
      mode: 'live', network: 'testnet', accountId: '0.0.7854018',
      topicsCreated: 3, messagesSubmitted: 10, connected: true,
    });
    mockGetAgentCount.mockReturnValue(5);

    const res = await GET();
    const data = await res.json();
    const hcs10 = data.standards.find((s: any) => s.code === 'HCS-10');

    expect(hcs10.status).toBe('verified');
    expect(hcs10.onChain).toBe(true);
    expect(hcs10.messageCount).toBe(10);
    expect(hcs10.topicId).toBe('0.0.7311321');
  });

  it('marks standards as configured when connected but no messages', async () => {
    mockGetStatus.mockReturnValue({
      mode: 'live', network: 'testnet', accountId: '0.0.7854018',
      topicsCreated: 0, messagesSubmitted: 0, connected: true,
    });
    mockGetAgentCount.mockReturnValue(0);

    const res = await GET();
    const data = await res.json();
    const hcs10 = data.standards.find((s: any) => s.code === 'HCS-10');

    expect(hcs10.status).toBe('configured');
    expect(hcs10.onChain).toBe(false);
  });

  it('marks standards as unavailable when not connected', async () => {
    mockGetStatus.mockReturnValue({
      mode: 'mock', network: 'testnet', accountId: 'mock',
      topicsCreated: 0, messagesSubmitted: 0, connected: false,
    });
    mockGetAgentCount.mockReturnValue(0);

    const res = await GET();
    const data = await res.json();
    const hcs10 = data.standards.find((s: any) => s.code === 'HCS-10');

    expect(hcs10.status).toBe('unavailable');
    expect(hcs10.onChain).toBe(false);
  });

  it('HCS-11 is verified when agents exist', async () => {
    mockGetStatus.mockReturnValue({
      mode: 'live', network: 'testnet', accountId: '0.0.7854018',
      topicsCreated: 3, messagesSubmitted: 5, connected: true,
    });
    mockGetAgentCount.mockReturnValue(3);

    const res = await GET();
    const data = await res.json();
    const hcs11 = data.standards.find((s: any) => s.code === 'HCS-11');

    expect(hcs11.status).toBe('verified');
    expect(hcs11.topicId).toBe('0.0.7854282');
  });

  it('HCS-26 is verified when agents exist on connected testnet', async () => {
    mockGetStatus.mockReturnValue({
      mode: 'live', network: 'testnet', accountId: '0.0.7854018',
      topicsCreated: 3, messagesSubmitted: 5, connected: true,
    });
    mockGetAgentCount.mockReturnValue(5);

    const res = await GET();
    const data = await res.json();
    const hcs26 = data.standards.find((s: any) => s.code === 'HCS-26');

    expect(hcs26.status).toBe('verified');
    expect(hcs26.onChain).toBe(true);
  });

  it('HCS-14, HCS-19, HCS-20 are verified when connected', async () => {
    mockGetStatus.mockReturnValue({
      mode: 'live', network: 'testnet', accountId: '0.0.7854018',
      topicsCreated: 1, messagesSubmitted: 1, connected: true,
    });
    mockGetAgentCount.mockReturnValue(0);

    const res = await GET();
    const data = await res.json();

    for (const code of ['HCS-14', 'HCS-19', 'HCS-20']) {
      const standard = data.standards.find((s: any) => s.code === code);
      expect(standard.status).toBe('verified');
      expect(standard.onChain).toBe(true);
    }
  });

  it('includes testnet stats in response', async () => {
    mockGetStatus.mockReturnValue({
      mode: 'live', network: 'testnet', accountId: '0.0.7854018',
      topicsCreated: 7, messagesSubmitted: 42, connected: true,
    });
    mockGetAgentCount.mockReturnValue(3);

    const res = await GET();
    const data = await res.json();

    expect(data.testnet.topicsCreated).toBe(7);
    expect(data.testnet.messagesSubmitted).toBe(42);
    expect(data.testnet.mode).toBe('live');
  });
});
