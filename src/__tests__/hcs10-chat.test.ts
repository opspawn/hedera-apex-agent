/**
 * Tests for HCS-10 direct messaging mode in /api/chat
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateSession, mockSendMessage } = vi.hoisted(() => ({
  mockCreateSession: vi.fn(),
  mockSendMessage: vi.fn(),
}));

const { mockCreateTopic, mockSendHCS10Message } = vi.hoisted(() => ({
  mockCreateTopic: vi.fn(),
  mockSendHCS10Message: vi.fn(),
}));

// Mock server context with HCS-10 client
vi.mock('@/lib/server', () => ({
  getServerContext: vi.fn().mockResolvedValue({
    chatMarketplaceCtx: {
      getAgents: () => [],
      getAgent: () => null,
      searchAgents: () => [],
    },
    hcs10: {
      createTopic: mockCreateTopic,
      sendMessage: mockSendHCS10Message,
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
  v4: vi.fn().mockReturnValue('test-uuid-hcs10'),
}));

import { POST as chatPost } from '@/app/api/chat/route';
import { NextRequest } from 'next/server';

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'), options);
}

describe('POST /api/chat (HCS-10 mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTopic.mockResolvedValue('0.0.12345');
    mockSendHCS10Message.mockResolvedValue({
      sequenceNumber: 1,
      timestamp: '2026-02-20T00:00:00Z',
    });
  });

  it('creates HCS-10 topic and sends message', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello via HCS-10',
        mode: 'hcs10',
        agentId: 'agent-123',
      }),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('hcs10');
    expect(data.topicId).toBe('0.0.12345');
    expect(data.sequenceNumber).toBeDefined();
    expect(data.response).toBeDefined();
    expect(data.sessionId).toBeDefined();
  });

  it('sends HCS-10 message with user content', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What agents are available?',
        mode: 'hcs10',
      }),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('hcs10');
    // Should have called sendMessage twice (user msg + agent response)
    expect(mockSendHCS10Message).toHaveBeenCalledTimes(2);
  });

  it('reuses existing topic for same session', async () => {
    // First message creates topic
    const req1 = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'First message',
        mode: 'hcs10',
      }),
    });
    const res1 = await chatPost(req1);
    const data1 = await res1.json();
    const sessionId = data1.sessionId;

    // Reset mock counts
    mockCreateTopic.mockClear();

    // Second message reuses topic via topicId parameter
    const req2 = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Second message',
        mode: 'hcs10',
        sessionId,
        topicId: data1.topicId,
      }),
    });
    const res2 = await chatPost(req2);
    const data2 = await res2.json();

    expect(data2.mode).toBe('hcs10');
    expect(data2.topicId).toBe('0.0.12345');
    // Topic should not be created again since we passed topicId
    expect(mockCreateTopic).not.toHaveBeenCalled();
  });

  it('uses provided topicId instead of creating new one', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        mode: 'hcs10',
        topicId: '0.0.99999',
      }),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(data.topicId).toBe('0.0.99999');
    expect(mockCreateTopic).not.toHaveBeenCalled();
  });

  it('falls back to local on HCS-10 failure', async () => {
    mockCreateTopic.mockRejectedValue(new Error('HCS-10 topic creation failed'));

    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        mode: 'hcs10',
        sessionId: 'fallback-session',
      }),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('local');
    expect(data.fallback).toBe(true);
    expect(data.hcs10Error).toBeDefined();
  });

  it('includes agentId in response when provided', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello',
        mode: 'hcs10',
        agentId: 'agent-456',
      }),
    });
    const res = await chatPost(req);
    const data = await res.json();

    expect(data.agentId).toBe('agent-456');
  });

  it('sends structured HCS-10 message to topic', async () => {
    const req = makeRequest('http://localhost:3003/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Test structured message',
        mode: 'hcs10',
        agentId: 'agent-789',
      }),
    });
    await chatPost(req);

    // Verify the first call (user message)
    expect(mockSendHCS10Message).toHaveBeenCalledWith(
      '0.0.12345',
      expect.objectContaining({
        type: 'hcs-10-chat-message',
        sender: 'user',
        content: 'Test structured message',
        agentId: 'agent-789',
      }),
    );

    // Verify the second call (agent response)
    expect(mockSendHCS10Message).toHaveBeenCalledWith(
      '0.0.12345',
      expect.objectContaining({
        type: 'hcs-10-chat-response',
        sender: 'agent',
      }),
    );
  });
});
