/**
 * Tests for /api/skills/search (GET)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockListSkills } = vi.hoisted(() => ({
  mockListSkills: vi.fn(),
}));

vi.mock('@/lib/hol/rb-client', () => ({
  getClient: vi.fn().mockResolvedValue({
    listSkills: mockListSkills,
  }),
}));

vi.mock('@/lib/server', () => ({
  getServerContext: vi.fn().mockResolvedValue({
    hcs26: {
      discoverSkills: vi.fn().mockResolvedValue({
        skills: [
          {
            topic_id: '0.0.999',
            manifest: { name: 'local-skill', description: 'A local skill' },
            published_at: '2026-01-01T00:00:00Z',
            publisher: 'test',
            status: 'published',
          },
        ],
        total: 1,
        query: 'test',
      }),
    },
  }),
}));

import { GET } from '@/app/api/skills/search/route';
import { NextRequest } from 'next/server';

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'));
}

describe('GET /api/skills/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns local results when source=local', async () => {
    const req = makeRequest('http://localhost:3003/api/skills/search?q=nlp&source=local');
    const res = await GET(req);
    const data = await res.json();

    expect(data.source).toBe('local');
  });

  it('returns broker results when available', async () => {
    mockListSkills.mockResolvedValue({
      skills: [
        { name: 'broker-skill', description: 'A skill from the broker', category: 'ai' },
      ],
    });

    const req = makeRequest('http://localhost:3003/api/skills/search?q=ai&source=broker');
    const res = await GET(req);
    const data = await res.json();

    expect(data.source).toBe('registry-broker');
    expect(data.skills.length).toBe(1);
    expect(data.skills[0].name).toBe('broker-skill');
  });

  it('returns hybrid results when source=hybrid', async () => {
    mockListSkills.mockResolvedValue({
      skills: [{ name: 'broker-skill-2', description: 'Hybrid test' }],
    });

    const req = makeRequest('http://localhost:3003/api/skills/search?q=test&source=hybrid');
    const res = await GET(req);
    const data = await res.json();

    expect(data.source).toBe('hybrid');
    expect(data.brokerSkills).toBeDefined();
    expect(data.localSkills).toBeDefined();
  });

  it('falls back to local when broker fails', async () => {
    mockListSkills.mockRejectedValue(new Error('Broker unavailable'));

    const req = makeRequest('http://localhost:3003/api/skills/search?q=test');
    const res = await GET(req);
    const data = await res.json();

    expect(data.source).toBe('local');
  });

  it('parses limit, category, tag, and featured params', async () => {
    mockListSkills.mockResolvedValue({ skills: [] });

    const req = makeRequest('http://localhost:3003/api/skills/search?q=test&limit=5&category=ai&tag=nlp&featured=true&source=broker');
    await GET(req);

    expect(mockListSkills).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test',
        limit: 5,
        tag: 'nlp',
        category: 'ai',
        featured: true,
        includeFiles: true,
      }),
    );
  });

  it('returns local when no query and broker returns empty', async () => {
    mockListSkills.mockResolvedValue({ skills: [] });

    const req = makeRequest('http://localhost:3003/api/skills/search?source=hybrid');
    const res = await GET(req);
    const data = await res.json();

    expect(data.source).toBe('local');
  });
});
