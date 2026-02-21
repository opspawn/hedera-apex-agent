/**
 * Tests for /api/skills (GET) — Skill listing endpoint
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockListPublishedSkills, mockGetPublishedCount, mockGetBrokerUrl } = vi.hoisted(() => ({
  mockListPublishedSkills: vi.fn(),
  mockGetPublishedCount: vi.fn(),
  mockGetBrokerUrl: vi.fn(),
}));

vi.mock('@/lib/server', () => ({
  getServerContext: vi.fn().mockResolvedValue({
    hcs26: {
      listPublishedSkills: mockListPublishedSkills,
      getPublishedCount: mockGetPublishedCount,
      getBrokerUrl: mockGetBrokerUrl,
    },
  }),
}));

import { GET } from '@/app/api/skills/route';
import { NextRequest } from 'next/server';

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'));
}

const MOCK_SKILLS = [
  {
    topic_id: '0.0.1001',
    manifest: {
      name: 'marketplace-search',
      version: '1.0.0',
      description: 'Search agents in the marketplace',
      author: 'OpSpawn Marketplace',
      license: 'MIT',
      skills: [
        {
          name: 'marketplace-search',
          description: 'Search across agents',
          category: 'discovery',
          tags: ['search', 'discovery', 'marketplace'],
          input_schema: { q: 'string' },
          output_schema: { agents: 'array' },
        },
      ],
      tags: ['marketplace', 'discovery'],
    },
    published_at: '2026-02-21T00:00:00Z',
    publisher: '0.0.7854018',
    status: 'published',
  },
  {
    topic_id: '0.0.1002',
    manifest: {
      name: 'agent-chat',
      version: '1.0.0',
      description: 'Chat with AI agents',
      author: 'OpSpawn Marketplace',
      license: 'MIT',
      skills: [
        {
          name: 'agent-chat',
          description: 'Real-time chat with agents',
          category: 'communication',
          tags: ['chat', 'messaging', 'hcs-10'],
          input_schema: { agent_id: 'string', message: 'string' },
          output_schema: { response: 'string' },
        },
      ],
      tags: ['chat', 'communication'],
    },
    published_at: '2026-02-21T00:00:01Z',
    publisher: '0.0.7854018',
    status: 'published',
  },
  {
    topic_id: '0.0.1003',
    manifest: {
      name: 'sentinelai-skills',
      version: '1.0.0',
      description: 'Security analysis skills',
      author: 'SentinelAI',
      license: 'MIT',
      skills: [
        {
          name: 'Smart Contract Audit',
          description: 'Audit smart contracts',
          category: 'blockchain',
          tags: ['security', 'audit', 'solidity'],
          input_schema: {},
          output_schema: {},
        },
      ],
      tags: ['security', 'blockchain'],
    },
    published_at: '2026-02-21T00:00:02Z',
    publisher: '0.0.7854100',
    status: 'published',
  },
];

describe('GET /api/skills', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListPublishedSkills.mockResolvedValue([...MOCK_SKILLS]);
    mockGetPublishedCount.mockReturnValue(MOCK_SKILLS.length);
    mockGetBrokerUrl.mockReturnValue('https://broker.hol.org');
  });

  it('returns all published skills', async () => {
    const req = makeRequest('http://localhost:3003/api/skills');
    const res = await GET(req);
    const data = await res.json();

    expect(data.skills).toHaveLength(3);
    expect(data.total).toBe(3);
    expect(data.published_count).toBe(3);
    expect(data.registry.standard).toBe('HCS-26');
    expect(data.registry.broker_url).toBe('https://broker.hol.org');
  });

  it('filters by category', async () => {
    const req = makeRequest('http://localhost:3003/api/skills?category=discovery');
    const res = await GET(req);
    const data = await res.json();

    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].manifest.name).toBe('marketplace-search');
    expect(data.total).toBe(1);
  });

  it('filters by tag', async () => {
    const req = makeRequest('http://localhost:3003/api/skills?tag=security');
    const res = await GET(req);
    const data = await res.json();

    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].manifest.name).toBe('sentinelai-skills');
  });

  it('supports pagination with limit and offset', async () => {
    const req = makeRequest('http://localhost:3003/api/skills?limit=1&offset=1');
    const res = await GET(req);
    const data = await res.json();

    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].manifest.name).toBe('agent-chat');
    expect(data.total).toBe(3);
    expect(data.offset).toBe(1);
    expect(data.limit).toBe(1);
  });

  it('returns empty when no skills match category filter', async () => {
    const req = makeRequest('http://localhost:3003/api/skills?category=nonexistent');
    const res = await GET(req);
    const data = await res.json();

    expect(data.skills).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it('returns empty when no skills published', async () => {
    mockListPublishedSkills.mockResolvedValue([]);
    mockGetPublishedCount.mockReturnValue(0);

    const req = makeRequest('http://localhost:3003/api/skills');
    const res = await GET(req);
    const data = await res.json();

    expect(data.skills).toHaveLength(0);
    expect(data.total).toBe(0);
    expect(data.published_count).toBe(0);
  });

  it('combines category and tag filters', async () => {
    const req = makeRequest('http://localhost:3003/api/skills?category=blockchain&tag=security');
    const res = await GET(req);
    const data = await res.json();

    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].manifest.name).toBe('sentinelai-skills');
  });

  it('tag filter matches manifest-level tags', async () => {
    const req = makeRequest('http://localhost:3003/api/skills?tag=chat');
    const res = await GET(req);
    const data = await res.json();

    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].manifest.name).toBe('agent-chat');
  });
});
