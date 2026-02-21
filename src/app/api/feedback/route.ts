/**
 * Agent Feedback API Route (ERC-8004)
 *
 * POST: Check eligibility and submit feedback for an agent
 * GET: Fetch feedback summary for an agent
 *
 * Uses HOL Registry Broker for on-chain feedback via ERC-8004.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/hol/rb-client';

/**
 * GET /api/feedback?uaid=...&includeRevoked=false
 * Fetch feedback summary for an agent.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uaid = searchParams.get('uaid');
  const includeRevoked = searchParams.get('includeRevoked') === 'true';

  if (!uaid) {
    return NextResponse.json({ error: 'uaid query parameter is required' }, { status: 400 });
  }

  try {
    const client = await getClient();
    const feedback = await client.getAgentFeedback(uaid, {
      includeRevoked,
    });

    return NextResponse.json({
      uaid,
      feedback,
      source: 'registry-broker',
    });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Failed to fetch feedback',
      details: err.message,
      uaid,
    }, { status: 500 });
  }
}

/**
 * POST /api/feedback
 * Body: { uaid, sessionId, score, tags }
 *
 * Checks eligibility first, then submits feedback if eligible.
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { uaid, sessionId, score, tag1, tag2 } = body as {
    uaid: string;
    sessionId: string;
    score: number;
    tag1?: string;
    tag2?: string;
  };

  if (!uaid || !sessionId) {
    return NextResponse.json({
      error: 'uaid and sessionId are required',
    }, { status: 400 });
  }

  if (typeof score !== 'number' || score < 0 || score > 100) {
    return NextResponse.json({
      error: 'score must be a number between 0 and 100',
    }, { status: 400 });
  }

  try {
    const client = await getClient();

    // Step 1: Check eligibility
    const eligibility = await client.checkAgentFeedbackEligibility(uaid, {
      sessionId,
    });

    if (!(eligibility as any)?.eligible) {
      return NextResponse.json({
        eligible: false,
        reason: (eligibility as any)?.reason || 'Not eligible for feedback',
        messageCount: (eligibility as any)?.messageCount,
        uaid,
        sessionId,
      }, { status: 403 });
    }

    // Step 2: Submit feedback
    const result = await client.submitAgentFeedback(uaid, {
      sessionId,
      score,
      tag1: tag1 || undefined,
      tag2: tag2 || undefined,
    });

    return NextResponse.json({
      success: true,
      feedback: result,
      uaid,
      sessionId,
      source: 'registry-broker',
    });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Failed to submit feedback',
      details: err.message,
      uaid,
      sessionId,
    }, { status: 500 });
  }
}
