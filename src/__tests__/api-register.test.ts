/**
 * Tests for POST /api/register (Agent Registration)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRegisterAgent, mockWaitForRegistrationCompletion } = vi.hoisted(() => ({
  mockRegisterAgent: vi.fn(),
  mockWaitForRegistrationCompletion: vi.fn(),
}));

// Mock rb-client
vi.mock('@/lib/hol/rb-client', () => ({
  getClient: vi.fn().mockImplementation(async () => ({
    registerAgent: mockRegisterAgent,
    waitForRegistrationCompletion: mockWaitForRegistrationCompletion,
  })),
}));

// Mock @hashgraph/sdk for fallback path
vi.mock('@hashgraph/sdk', () => ({
  Client: {
    forTestnet: vi.fn().mockReturnValue({
      setOperator: vi.fn(),
      close: vi.fn(),
    }),
  },
  TopicMessageSubmitTransaction: vi.fn().mockImplementation(() => ({
    setTopicId: vi.fn().mockReturnThis(),
    setMessage: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({
      getReceipt: vi.fn().mockResolvedValue({
        topicSequenceNumber: { toNumber: () => 42 },
      }),
    }),
  })),
}));

import { POST } from '@/app/api/register/route';
import { NextRequest } from 'next/server';

function makeRequest(body: any): NextRequest {
  return new NextRequest(new URL('http://localhost:3003/api/register'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRegisterAgent.mockReset();
    mockWaitForRegistrationCompletion.mockReset();
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest({ description: 'test', capabilities: ['a'] });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('name');
  });

  it('returns 400 when description is missing', async () => {
    const req = makeRequest({ name: 'test', capabilities: ['a'] });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 when capabilities is empty', async () => {
    const req = makeRequest({ name: 'test', description: 'desc', capabilities: [] });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new NextRequest(new URL('http://localhost:3003/api/register'), {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid JSON');
  });

  it('registers via broker successfully', async () => {
    mockRegisterAgent.mockResolvedValue({
      uaid: 'uaid-test-123',
      agentId: 'agent-test-456',
      inboundTopicId: '0.0.111',
      outboundTopicId: '0.0.222',
      profileTopicId: '0.0.333',
    });

    const req = makeRequest({
      name: 'Test Agent',
      description: 'A test agent for the marketplace',
      capabilities: ['data-analysis', 'summarization'],
      profile: {
        display_name: 'Test Agent Display',
        bio: 'A specialized test agent',
        agent_type: 'autonomous',
        model: 'gpt-4',
        creator: 'TestOrg',
        socials: [{ platform: 'github', handle: 'test' }],
      },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.uaid).toBe('uaid-test-123');
    expect(data.agentId).toBe('agent-test-456');
    expect(data.method).toBe('registry-broker');
    expect(data.name).toBe('Test Agent Display');
    expect(data.timestamp).toBeDefined();
  });

  it('handles async registration with pending status', async () => {
    mockRegisterAgent.mockResolvedValue({
      status: 'pending',
      attemptId: 'attempt-789',
    });
    mockWaitForRegistrationCompletion.mockResolvedValue({
      uaid: 'uaid-async-123',
      agentId: 'agent-async-456',
    });

    const req = makeRequest({
      name: 'Async Agent',
      description: 'Tests async registration flow',
      capabilities: ['async-processing'],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.uaid).toBe('uaid-async-123');
    expect(mockWaitForRegistrationCompletion).toHaveBeenCalledWith('attempt-789', {
      intervalMs: 2000,
      timeoutMs: 60000,
    });
  });

  it('uses name as display_name fallback', async () => {
    mockRegisterAgent.mockResolvedValue({ uaid: 'uaid-fb' });

    const req = makeRequest({
      name: 'FallbackName',
      description: 'Test fallback',
      capabilities: ['test'],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.name).toBe('FallbackName');
    expect(mockRegisterAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          display_name: 'FallbackName',
          bio: 'Test fallback',
        }),
      })
    );
  });

  it('includes privacy policy in properties when provided', async () => {
    mockRegisterAgent.mockResolvedValue({ uaid: 'uaid-priv' });

    const req = makeRequest({
      name: 'Privacy Agent',
      description: 'Agent with privacy policy',
      capabilities: ['analysis'],
      privacy: {
        data_collected: ['queries', 'logs'],
        data_purpose: 'Service improvement',
        retention_period: '90 days',
      },
    });

    const res = await POST(req);

    expect(mockRegisterAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          properties: expect.objectContaining({
            privacy_policy: {
              data_collected: ['queries', 'logs'],
              data_purpose: 'Service improvement',
              retention_period: '90 days',
            },
          }),
        }),
      })
    );
  });

  it('generates correct alias from name', async () => {
    mockRegisterAgent.mockResolvedValue({ uaid: 'uaid-alias' });

    const req = makeRequest({
      name: 'My Cool Agent!!',
      description: 'Alias test',
      capabilities: ['test'],
    });

    await POST(req);

    expect(mockRegisterAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: expect.objectContaining({
          alias: 'my-cool-agent',
        }),
      })
    );
  });

  it('sets metadata with version and standards', async () => {
    mockRegisterAgent.mockResolvedValue({ uaid: 'uaid-meta' });

    const req = makeRequest({
      name: 'Meta Agent',
      description: 'Metadata test',
      capabilities: ['test'],
    });

    await POST(req);

    expect(mockRegisterAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          version: '0.23.0',
          standards: ['HCS-10', 'HCS-11', 'HCS-19'],
          registered_via: 'hedera-agent-marketplace',
        }),
      })
    );
  });

  it('returns topic IDs from registration result', async () => {
    mockRegisterAgent.mockResolvedValue({
      uaid: 'uaid-topics',
      agentId: 'agent-topics',
      topicIds: {
        inbound: '0.0.100',
        outbound: '0.0.200',
        profile: '0.0.300',
      },
    });

    const req = makeRequest({
      name: 'Topic Agent',
      description: 'Topic test',
      capabilities: ['test'],
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.topicIds).toEqual({
      inbound: '0.0.100',
      outbound: '0.0.200',
      profile: '0.0.300',
    });
  });
});
