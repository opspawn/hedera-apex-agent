/**
 * Chat Session Management
 *
 * POST: Create a new chat session (local or broker-backed)
 * Supports creating Registry Broker relay sessions with remote agents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/hol/rb-client';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — creates a local session
  }

  const { uaid, mode = 'local' } = body as {
    uaid?: string;
    mode?: 'local' | 'broker';
  };

  // Create a broker-backed session if requested
  if (mode === 'broker' && uaid) {
    try {
      const client = await getClient();
      const brokerSession = await client.chat.createSession({
        uaid,
        historyTtlSeconds: 900,
      });

      return NextResponse.json({
        sessionId: uuid(),
        brokerSessionId: (brokerSession as any).sessionId,
        uaid,
        mode: 'broker',
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      return NextResponse.json({
        sessionId: uuid(),
        mode: 'local',
        brokerError: err.message,
        fallback: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Local session
  return NextResponse.json({
    sessionId: uuid(),
    mode: 'local',
    createdAt: new Date().toISOString(),
  });
}
