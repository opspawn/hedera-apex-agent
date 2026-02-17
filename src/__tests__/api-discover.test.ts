/**
 * Tests for /api/marketplace/discover (GET and POST)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getServerContext
vi.mock('@/lib/server', () => ({
  getServerContext: vi.fn().mockResolvedValue({
    marketplace: {
      discoverAgents: vi.fn().mockResolvedValue({
        agents: [
          {
            agent: { agent_id: 'test-1', name: 'Agent1', description: 'A local agent' },
            identity: {},
            profile: {},
            publishedSkills: [],
            verificationStatus: 'verified',
          },
        ],
        total: 1,
      }),
    },
  }),
}));

// Mock rb-client
vi.mock('@/lib/hol/rb-client', () => ({
  getClient: vi.fn().mockResolvedValue({
    search: vi.fn().mockResolvedValue({
      hits: [
        {
          uaid: 'uaid-broker-1',
          name: 'BrokerAgent',
          description: 'A broker-discovered agent',
          endpoints: { primary: 'https://example.com' },
          protocols: ['hcs-10'],
          capabilities: ['chat'],
          trustScore: 80,
          registry: 'hashgraph-online',
          available: true,
        },
      ],
      total: 1,
    }),
    vectorSearch: vi.fn().mockResolvedValue({
      hits: [
        {
          agent: {
            uaid: 'uaid-vec-1',
            display_name: 'VectorAgent',
            bio: 'Found via vector search',
            endpoints: { primary: 'https://vec.example.com' },
            registry: 'hashgraph-online',
          },
          score: 0.95,
        },
      ],
    }),
  }),
}));

import { GET, POST } from '@/app/api/marketplace/discover/route';
import { NextRequest } from 'next/server';

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'), options);
}

describe('GET /api/marketplace/discover', () => {
  it('returns local results when no query provided', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover');
    const res = await GET(req);
    const data = await res.json();

    expect(data.source).toBe('local');
    expect(data.agents).toBeDefined();
  });

  it('returns broker results when query and mode=broker', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=test&mode=broker');
    const res = await GET(req);
    const data = await res.json();

    expect(data.source).toBe('registry-broker');
    expect(data.agents.length).toBeGreaterThan(0);
    expect(data.agents[0].uaid).toBe('uaid-broker-1');
    expect(data.agents[0].source).toBe('registry-broker');
  });

  it('returns hybrid results when query and mode=hybrid', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?q=test&mode=hybrid');
    const res = await GET(req);
    const data = await res.json();

    expect(data.source).toBe('hybrid');
    expect(data.agents).toBeDefined();
    expect(data.localAgents).toBeDefined();
    expect(data.brokerTotal).toBeDefined();
    expect(data.localTotal).toBeDefined();
  });

  it('parses pagination params correctly', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?limit=5&offset=10');
    const res = await GET(req);
    const data = await res.json();

    expect(data.source).toBe('local');
  });

  it('parses filter params: verified, category, tags', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover?verified=true&category=ai&tags=nlp,ml');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
  });
});

describe('POST /api/marketplace/discover (vector search)', () => {
  it('returns 400 if query is missing', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('query is required');
  });

  it('returns vector search results', async () => {
    const req = makeRequest('http://localhost:3003/api/marketplace/discover', {
      method: 'POST',
      body: JSON.stringify({ query: 'find me a security agent', limit: 5 }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.source).toBe('vector-search');
    expect(data.agents.length).toBeGreaterThan(0);
    expect(data.agents[0].name).toBe('VectorAgent');
    expect(data.agents[0].similarity).toBe(0.95);
  });
});
