/**
 * Tests for /api/feedback (GET and POST)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetAgentFeedback, mockCheckEligibility, mockSubmitFeedback } = vi.hoisted(() => ({
  mockGetAgentFeedback: vi.fn(),
  mockCheckEligibility: vi.fn(),
  mockSubmitFeedback: vi.fn(),
}));

vi.mock('@/lib/hol/rb-client', () => ({
  getClient: vi.fn().mockResolvedValue({
    getAgentFeedback: mockGetAgentFeedback,
    checkAgentFeedbackEligibility: mockCheckEligibility,
    submitAgentFeedback: mockSubmitFeedback,
  }),
}));

import { GET, POST } from '@/app/api/feedback/route';
import { NextRequest } from 'next/server';

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'), options);
}

describe('GET /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when uaid is missing', async () => {
    const req = makeRequest('http://localhost:3003/api/feedback');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('uaid query parameter is required');
  });

  it('returns feedback summary for valid uaid', async () => {
    mockGetAgentFeedback.mockResolvedValue({
      averageScore: 85,
      totalFeedback: 12,
      tags: { helpful: 8, fast: 4 },
    });

    const req = makeRequest('http://localhost:3003/api/feedback?uaid=test-agent-uaid');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uaid).toBe('test-agent-uaid');
    expect(data.feedback.averageScore).toBe(85);
    expect(data.source).toBe('registry-broker');
  });

  it('passes includeRevoked parameter', async () => {
    mockGetAgentFeedback.mockResolvedValue({ averageScore: 70 });

    const req = makeRequest('http://localhost:3003/api/feedback?uaid=test&includeRevoked=true');
    await GET(req);

    expect(mockGetAgentFeedback).toHaveBeenCalledWith('test', { includeRevoked: true });
  });

  it('returns 500 on error', async () => {
    mockGetAgentFeedback.mockRejectedValue(new Error('API timeout'));

    const req = makeRequest('http://localhost:3003/api/feedback?uaid=test');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to fetch feedback');
    expect(data.details).toBe('API timeout');
  });
});

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when uaid or sessionId is missing', async () => {
    const req = makeRequest('http://localhost:3003/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ score: 80 }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('uaid and sessionId are required');
  });

  it('returns 400 for invalid score', async () => {
    const req = makeRequest('http://localhost:3003/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ uaid: 'test', sessionId: 'sess-1', score: 150 }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('score must be a number between 0 and 100');
  });

  it('returns 400 for negative score', async () => {
    const req = makeRequest('http://localhost:3003/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ uaid: 'test', sessionId: 'sess-1', score: -5 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when not eligible for feedback', async () => {
    mockCheckEligibility.mockResolvedValue({
      eligible: false,
      reason: 'Minimum message threshold not met',
      messageCount: 2,
    });

    const req = makeRequest('http://localhost:3003/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ uaid: 'test', sessionId: 'sess-1', score: 80 }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.eligible).toBe(false);
    expect(data.reason).toContain('Minimum message threshold');
  });

  it('submits feedback successfully when eligible', async () => {
    mockCheckEligibility.mockResolvedValue({ eligible: true });
    mockSubmitFeedback.mockResolvedValue({
      feedbackId: 'fb-001',
      recorded: true,
    });

    const req = makeRequest('http://localhost:3003/api/feedback', {
      method: 'POST',
      body: JSON.stringify({
        uaid: 'test-agent',
        sessionId: 'sess-1',
        score: 90,
        tag1: 'helpful',
        tag2: 'fast',
      }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.feedback.feedbackId).toBe('fb-001');
    expect(data.source).toBe('registry-broker');
  });

  it('returns 500 on submission error', async () => {
    mockCheckEligibility.mockResolvedValue({ eligible: true });
    mockSubmitFeedback.mockRejectedValue(new Error('DB write failed'));

    const req = makeRequest('http://localhost:3003/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ uaid: 'test', sessionId: 'sess-1', score: 75 }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to submit feedback');
  });
});
