/**
 * Tests for POST /api/marketplace/register (marketplace agent registration)
 *
 * Sprint 28: Validates the enhanced register endpoint with GET info,
 * POST validation, skill normalization, and error handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRegisterAgentWithIdentity = vi.fn();
const mockGetAgentCount = vi.fn().mockReturnValue(8);

// Mock server context
vi.mock('@/lib/server', () => ({
  getServerContext: vi.fn().mockResolvedValue({
    marketplace: {
      registerAgentWithIdentity: (...args: any[]) => mockRegisterAgentWithIdentity(...args),
      getAgentCount: () => mockGetAgentCount(),
    },
    config: {
      hedera: {
        accountId: '0.0.7854018',
        network: 'testnet',
      },
    },
  }),
}));

import { GET, POST } from '@/app/api/marketplace/register/route';
import { NextRequest } from 'next/server';

function makeRequest(body?: any): NextRequest {
  if (!body) {
    return new NextRequest(new URL('http://localhost:3003/api/marketplace/register'));
  }
  return new NextRequest(new URL('http://localhost:3003/api/marketplace/register'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET /api/marketplace/register', () => {
  it('returns registration info and example', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.registered_agents).toBe(8);
    expect(data.network).toBe('testnet');
    expect(data.account).toBe('0.0.7854018');
    expect(data.required_fields).toContain('name');
    expect(data.required_fields).toContain('description');
    expect(data.required_fields).toContain('skills');
    expect(data.required_fields).toContain('endpoint');
    expect(data.optional_fields).toContain('protocols');
    expect(data.optional_fields).toContain('payment_address');
    expect(data.example).toBeDefined();
    expect(data.example.name).toBe('MyAgent');
  });
});

describe('POST /api/marketplace/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAgentCount.mockReturnValue(8);
    mockRegisterAgentWithIdentity.mockReset();
  });

  it('returns 400 when name is missing', async () => {
    const req = makeRequest({
      description: 'test agent',
      skills: [{ name: 'test' }],
      endpoint: 'https://example.com',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('name');
  });

  it('returns 400 when description is missing', async () => {
    const req = makeRequest({
      name: 'TestAgent',
      skills: [{ name: 'test' }],
      endpoint: 'https://example.com',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('description');
  });

  it('returns 400 when skills is not an array', async () => {
    const req = makeRequest({
      name: 'TestAgent',
      description: 'test',
      skills: 'not-an-array',
      endpoint: 'https://example.com',
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('skills');
  });

  it('returns 400 when endpoint is missing', async () => {
    const req = makeRequest({
      name: 'TestAgent',
      description: 'test',
      skills: [{ name: 'test' }],
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('endpoint');
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new NextRequest(new URL('http://localhost:3003/api/marketplace/register'), {
      method: 'POST',
      body: 'not valid json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid JSON');
  });

  it('registers agent successfully with complete data', async () => {
    mockRegisterAgentWithIdentity.mockResolvedValue({
      agent: {
        agent_id: 'agent-new-1',
        name: 'NewAgent',
        status: 'online',
        inbound_topic: '0.0.100',
        outbound_topic: '0.0.101',
        profile_topic: '0.0.102',
        registered_at: '2026-02-20T00:00:00.000Z',
      },
      verificationStatus: 'verified',
      publishedSkills: [{ id: 'skill-1' }],
    });

    const req = makeRequest({
      name: 'NewAgent',
      description: 'A brand new agent for testing',
      skills: [
        {
          name: 'Data Processing',
          description: 'Processes structured data',
          category: 'data analysis',
          tags: ['data', 'etl'],
          pricing: { amount: 2, token: 'HBAR', unit: 'per_call' },
        },
      ],
      endpoint: 'https://new-agent.example.com/a2a',
      protocols: ['hcs-10', 'a2a-v0.3', 'mcp'],
      payment_address: '0.0.9999',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.agent_id).toBe('agent-new-1');
    expect(data.name).toBe('NewAgent');
    expect(data.verification).toBe('verified');
    expect(data.skills_published).toBe(1);
    expect(data.inbound_topic).toBe('0.0.100');
    expect(data.outbound_topic).toBe('0.0.101');
    expect(data.profile_topic).toBe('0.0.102');
  });

  it('normalizes skills with defaults', async () => {
    mockRegisterAgentWithIdentity.mockResolvedValue({
      agent: {
        agent_id: 'agent-norm-1',
        name: 'NormAgent',
        status: 'online',
        inbound_topic: '0.0.200',
        outbound_topic: '0.0.201',
        profile_topic: '0.0.202',
        registered_at: '2026-02-20T00:00:00.000Z',
      },
      verificationStatus: 'verified',
      publishedSkills: [],
    });

    const req = makeRequest({
      name: 'NormAgent',
      description: 'Agent with minimal skills',
      skills: [{ name: 'MinimalSkill' }],
      endpoint: 'https://norm.example.com',
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    // Check that registerAgentWithIdentity was called with normalized skills
    const callArgs = mockRegisterAgentWithIdentity.mock.calls[0][0];
    expect(callArgs.skills[0].category).toBe('general');
    expect(callArgs.skills[0].tags).toEqual([]);
    expect(callArgs.skills[0].pricing).toEqual({ amount: 0, token: 'HBAR', unit: 'per_call' });
    expect(callArgs.skills[0].input_schema).toEqual({ type: 'object' });
  });

  it('uses default protocols when not provided', async () => {
    mockRegisterAgentWithIdentity.mockResolvedValue({
      agent: { agent_id: 'agent-def', name: 'DefAgent', status: 'online', inbound_topic: '', outbound_topic: '', profile_topic: '', registered_at: '' },
      verificationStatus: 'verified',
      publishedSkills: [],
    });

    const req = makeRequest({
      name: 'DefAgent',
      description: 'Agent with default protocols',
      skills: [{ name: 'Test' }],
      endpoint: 'https://def.example.com',
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const callArgs = mockRegisterAgentWithIdentity.mock.calls[0][0];
    expect(callArgs.protocols).toEqual(['hcs-10', 'a2a-v0.3']);
  });

  it('uses account ID as default payment address', async () => {
    mockRegisterAgentWithIdentity.mockResolvedValue({
      agent: { agent_id: 'agent-pay', name: 'PayAgent', status: 'online', inbound_topic: '', outbound_topic: '', profile_topic: '', registered_at: '' },
      verificationStatus: 'verified',
      publishedSkills: [],
    });

    const req = makeRequest({
      name: 'PayAgent',
      description: 'Agent without payment address',
      skills: [{ name: 'Test' }],
      endpoint: 'https://pay.example.com',
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const callArgs = mockRegisterAgentWithIdentity.mock.calls[0][0];
    expect(callArgs.payment_address).toBe('0.0.7854018');
  });

  it('returns 500 when registration throws', async () => {
    mockRegisterAgentWithIdentity.mockRejectedValue(new Error('HCS-10 topic creation failed'));

    const req = makeRequest({
      name: 'FailAgent',
      description: 'This registration will fail',
      skills: [{ name: 'Test' }],
      endpoint: 'https://fail.example.com',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Registration failed');
    expect(data.details).toContain('HCS-10 topic creation failed');
  });
});
