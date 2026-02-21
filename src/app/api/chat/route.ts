/**
 * Chat API Route
 *
 * Supports three modes:
 * 1. Local marketplace responder (default) — answers questions about agents, skills, etc.
 * 2. Registry Broker relay — creates real chat sessions with remote agents via HOL
 * 3. HCS-10 direct — sends messages via Hedera Consensus Service topics
 *
 * Mode is determined by the `mode` field in the request body:
 * - mode: 'local' (default) — uses buildMarketplaceResponse
 * - mode: 'broker' — relays through Registry Broker chat
 * - mode: 'hcs10' — sends via HCS-10 topic messaging
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';
import { buildMarketplaceResponse } from '@/lib/chat/chat-server';
import { getClient } from '@/lib/hol/rb-client';
import { v4 as uuid } from 'uuid';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  topicId?: string;
  sequenceNumber?: number;
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  brokerSessionId?: string;
  hcs10TopicId?: string;
  mode: 'local' | 'broker' | 'hcs10';
}

const localSessions = new Map<string, ChatSession>();

function getOrCreateSession(sessionId?: string, mode: 'local' | 'broker' | 'hcs10' = 'local'): ChatSession {
  if (sessionId && localSessions.has(sessionId)) {
    return localSessions.get(sessionId)!;
  }
  const id = sessionId ?? uuid();
  const session: ChatSession = {
    id,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    mode,
  };
  localSessions.set(id, session);
  return session;
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const {
    message,
    sessionId,
    mode = 'local',
    uaid,
    agentId,
    topicId,
  } = body as {
    message?: string;
    sessionId?: string;
    mode?: 'local' | 'broker' | 'hcs10';
    uaid?: string;
    agentId?: string;
    topicId?: string;
  };

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // --- HCS-10 Direct Messaging Mode ---
  if (mode === 'hcs10') {
    return handleHCS10Chat(message.trim(), sessionId, agentId, topicId);
  }

  // --- Registry Broker Chat Relay Mode ---
  if (mode === 'broker') {
    return handleBrokerChat(message.trim(), sessionId, uaid);
  }

  // --- Local Marketplace Responder Mode ---
  const ctx = await getServerContext();
  const session = getOrCreateSession(sessionId, 'local');

  const userMsg: ChatMessage = {
    id: uuid(),
    role: 'user',
    content: message.trim(),
    timestamp: new Date().toISOString(),
  };
  session.messages.push(userMsg);
  session.updatedAt = new Date().toISOString();

  const result = buildMarketplaceResponse(message.trim(), ctx.chatMarketplaceCtx);

  const agentMsg: ChatMessage = {
    id: uuid(),
    role: 'agent',
    content: result.response,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(agentMsg);
  session.updatedAt = new Date().toISOString();

  return NextResponse.json({
    response: result.response,
    sessionId: session.id,
    agentId: result.agentId,
    txId: result.txId,
    mode: 'local',
  });
}

/**
 * Handle chat through Registry Broker relay.
 * Creates a real session with a remote agent via HOL chat infrastructure.
 */
async function handleBrokerChat(
  message: string,
  sessionId?: string,
  uaid?: string,
): Promise<NextResponse> {
  try {
    const client = await getClient();
    const session = getOrCreateSession(sessionId, 'broker');

    // Create broker session if we don't have one yet
    if (!session.brokerSessionId) {
      if (!uaid) {
        return NextResponse.json({
          error: 'uaid is required for broker chat mode (first message must include target agent UAID)',
        }, { status: 400 });
      }

      const brokerSession = await client.chat.createSession({
        uaid,
        historyTtlSeconds: 900,
      });
      session.brokerSessionId = (brokerSession as any).sessionId;
    }

    // Record user message locally
    session.messages.push({
      id: uuid(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Send message through broker relay
    const reply = await client.chat.sendMessage({
      sessionId: session.brokerSessionId!,
      message,
    });

    const replyContent = (reply as any)?.message || (reply as any)?.response || 'No response from agent';

    // Record agent response locally
    session.messages.push({
      id: uuid(),
      role: 'agent',
      content: replyContent,
      timestamp: new Date().toISOString(),
    });
    session.updatedAt = new Date().toISOString();

    return NextResponse.json({
      response: replyContent,
      sessionId: session.id,
      brokerSessionId: session.brokerSessionId,
      mode: 'broker',
    });
  } catch (err: any) {
    // Fallback to local responder if broker fails
    console.error('[chat] Broker relay failed, falling back to local:', err.message);

    const ctx = await getServerContext();
    const result = buildMarketplaceResponse(message, ctx.chatMarketplaceCtx);

    return NextResponse.json({
      response: result.response,
      sessionId: sessionId || uuid(),
      mode: 'local',
      brokerError: err.message,
      fallback: true,
    });
  }
}

/**
 * Handle chat through HCS-10 direct messaging.
 * Creates an HCS topic for the conversation and sends messages via Hedera Consensus Service.
 */
async function handleHCS10Chat(
  message: string,
  sessionId?: string,
  agentId?: string,
  topicId?: string,
): Promise<NextResponse> {
  try {
    const ctx = await getServerContext();
    const session = getOrCreateSession(sessionId, 'hcs10');

    // Create or reuse an HCS-10 topic for this conversation
    if (!session.hcs10TopicId) {
      if (topicId) {
        session.hcs10TopicId = topicId;
      } else {
        // Create a new conversation topic
        const newTopicId = await ctx.hcs10.createTopic(
          `hcs10:chat:${agentId || 'marketplace'}:${session.id.slice(0, 8)}`
        );
        session.hcs10TopicId = newTopicId;
      }
    }

    // Send message to HCS-10 topic
    const sendResult = await ctx.hcs10.sendMessage(session.hcs10TopicId, {
      type: 'hcs-10-chat-message',
      sender: 'user',
      agentId: agentId || undefined,
      content: message,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });

    // Record user message
    session.messages.push({
      id: uuid(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      topicId: session.hcs10TopicId,
      sequenceNumber: sendResult.sequenceNumber,
    });

    // Generate a local response (agent would respond via their own HCS-10 listener)
    const localResult = buildMarketplaceResponse(message, ctx.chatMarketplaceCtx);

    // Send agent response to the topic as well
    const agentSendResult = await ctx.hcs10.sendMessage(session.hcs10TopicId, {
      type: 'hcs-10-chat-response',
      sender: 'agent',
      agentId: agentId || 'marketplace',
      content: localResult.response,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });

    session.messages.push({
      id: uuid(),
      role: 'agent',
      content: localResult.response,
      timestamp: new Date().toISOString(),
      topicId: session.hcs10TopicId,
      sequenceNumber: agentSendResult.sequenceNumber,
    });
    session.updatedAt = new Date().toISOString();

    return NextResponse.json({
      response: localResult.response,
      sessionId: session.id,
      topicId: session.hcs10TopicId,
      sequenceNumber: agentSendResult.sequenceNumber,
      agentId: localResult.agentId || agentId,
      mode: 'hcs10',
    });
  } catch (err: any) {
    // Fallback to local mode if HCS-10 fails
    console.error('[chat] HCS-10 messaging failed, falling back to local:', err.message);

    const ctx = await getServerContext();
    const result = buildMarketplaceResponse(message, ctx.chatMarketplaceCtx);

    return NextResponse.json({
      response: result.response,
      sessionId: sessionId || uuid(),
      mode: 'local',
      hcs10Error: err.message,
      fallback: true,
    });
  }
}
