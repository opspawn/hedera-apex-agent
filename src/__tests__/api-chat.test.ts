/**
 * Tests for /api/chat (POST) and /api/chat/session (POST)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateSession, mockSendMessage } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockSendMessage: vi.fn(),
}));

// Mock server context
vi.mock('@/lib/server', () => ({
  getServerContext: vi.fn().mockResolvedValue({
    chatMarketplaceCtx: {
      getAgents: () => [],
      getAgent: () => null,
      searchAgents: () => [],
    },
  }),
}));

// Mock rb-client
vi.mock('@/lib/hol/rb-client', () => ({
  getClient: vi.fn().mockResolvedValue({
    chat: {
      createSession: mockCreateSession,
      sendMessage: mockSendMessage,
    },
  }),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}));

import { POST as chatPost } from '@/app/api/chat/route';
import { POST as sessionPost } from '@/app/api/chat/session/route';
import { NextRequest } from 'next/server';

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'), options);
}

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when message is missing', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Message is required');
  });

  it('returns 400 for empty string message', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: '   ' }),
    });
    const res = await chatPost(req);
    expect(res.status).toBe(400);
  });

  it('responds in local mode by default', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('local');
    expect(data.response).toBeDefined();
    expect(data.sessionId).toBeDefined();
  });

  it('uses broker mode when specified', async () => {
    mockCreateSession.mockResolvedValue({ sessionId: 'broker-sess-1' });
    mockSendMessage.mockResolvedValue({ message: 'Hello from remote agent!' });

    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hi agent',
        mode: 'broker',
        uaid: 'test-uaid',
      }),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('broker');
    expect(data.response).toBe('Hello from remote agent!');
  });

  it('returns 400 in broker mode without uaid on first message', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        mode: 'broker',
      }),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('uaid is required');
  });

  it('falls back to local mode when broker fails', async () => {
    mockCreateSession.mockRejectedValue(new Error('Broker connection failed'));

    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        mode: 'broker',
        uaid: 'test-uaid',
        sessionId: 'new-session-fallback',
      }),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('local');
    expect(data.fallback).toBe(true);
    expect(data.brokerError).toBeDefined();
  });
});

describe('POST /api/chat/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a local session with no body', async () => {
    const req = makeRequest('http://localhost:3003/api/chat/session', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await sessionPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('local');
    expect(data.sessionId).toBeDefined();
    expect(data.createdAt).toBeDefined();
  });

  it('creates a broker session with uaid', async () => {
    mockCreateSession.mockResolvedValue({ sessionId: 'broker-sess-2' });

    const req = makeRequest('http://localhost:3003/api/chat/session', {
      method: 'POST',
      body: JSON.stringify({ mode: 'broker', uaid: 'test-uaid-2' }),
    });
    const res = await sessionPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('broker');
    expect(data.brokerSessionId).toBe('broker-sess-2');
    expect(data.uaid).toBe('test-uaid-2');
  });

  it('falls back to local when broker session fails', async () => {
    mockCreateSession.mockRejectedValue(new Error('Broker unavailable'));

    const req = makeRequest('http://localhost:3003/api/chat/session', {
      method: 'POST',
      body: JSON.stringify({ mode: 'broker', uaid: 'test-uaid' }),
    });
    const res = await sessionPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('local');
    expect(data.fallback).toBe(true);
    expect(data.brokerError).toBe('Broker unavailable');
  });
});
