/**
 * Chat API Route
 *
 * Supports two modes:
 * 1. Local marketplace responder (default) — answers questions about agents, skills, etc.
 * 2. Registry Broker relay — creates real chat sessions with remote agents via HOL
 *
 * Mode is determined by the `mode` field in the request body:
 * - mode: 'local' (default) — uses buildMarketplaceResponse
 * - mode: 'broker' — relays through Registry Broker chat
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
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  brokerSessionId?: string;
  mode: 'local' | 'broker';
}

const localSessions = new Map<string, ChatSession>();

function getOrCreateSession(sessionId?: string, mode: 'local' | 'broker' = 'local'): ChatSession {
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
  const body = await request.json();
  const {
    message,
    sessionId,
    mode = 'local',
    uaid,
  } = body as {
    message?: string;
    sessionId?: string;
    mode?: 'local' | 'broker';
    uaid?: string;
  };

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
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
