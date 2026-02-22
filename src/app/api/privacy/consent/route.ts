import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';
import { ProcessingBasis } from '@/lib/hcs/hcs19-types';

/**
 * POST /api/privacy/consent — Grant consent for data sharing between agents
 *
 * Body: {
 *   user_id: string,
 *   agent_id: string,
 *   purposes: string[],
 *   data_types?: string[],
 *   jurisdiction?: string,
 *   retention?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getServerContext();
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const {
      user_id,
      agent_id,
      purposes,
      data_types,
      jurisdiction,
      retention,
    } = body;

    if (!user_id || !agent_id || !purposes || !Array.isArray(purposes) || purposes.length === 0) {
      return NextResponse.json(
        { error: 'user_id, agent_id, and purposes[] are required' },
        { status: 400 },
      );
    }

    // Check for existing active consent for this user+agent to avoid duplicates
    const existingConsents = await ctx.privacyService.listActiveConsents(agent_id);
    const existingForUser = existingConsents.find(
      c => c.user_id === user_id && purposes.every((p: string) => c.purposes.includes(p)),
    );
    if (existingForUser) {
      return NextResponse.json(
        {
          consent: existingForUser,
          existing: true,
          message: 'Active consent already exists for this user, agent, and purpose(s).',
        },
        { status: 200 },
      );
    }

    const result = await ctx.privacyService.grantConsent({
      user_id,
      agent_id,
      purposes,
      data_types: data_types || ['task_data'],
      jurisdiction: jurisdiction || 'US',
      legal_basis: ProcessingBasis.Consent,
      consent_method: 'api_request',
      retention_period: retention || '6_months',
      withdrawal_method: 'api_revoke',
      notice_reference: `/api/privacy/policy?agentId=${agent_id}`,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to grant consent' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/privacy/consent?agentId=X&userId=Y — Check consent status
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const userId = searchParams.get('userId');
    const consentId = searchParams.get('consentId');
    const purpose = searchParams.get('purpose');

    if (consentId) {
      const consent = await ctx.privacyService.getConsent(consentId);
      if (!consent) {
        return NextResponse.json({ error: 'Consent not found' }, { status: 404 });
      }
      return NextResponse.json({ consent });
    }

    if (userId && purpose) {
      const result = await ctx.privacyService.checkConsent(userId, purpose);
      return NextResponse.json(result);
    }

    if (agentId) {
      const consents = await ctx.privacyService.listActiveConsents(agentId);
      return NextResponse.json({ consents, total: consents.length });
    }

    if (userId) {
      const consents = await ctx.privacyService.listConsents(userId);
      return NextResponse.json({ consents, total: consents.length });
    }

    return NextResponse.json(
      { error: 'Provide agentId, userId, consentId, or userId+purpose' },
      { status: 400 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to check consent' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/privacy/consent — Revoke consent
 *
 * Body: { consentId: string, reason?: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const ctx = await getServerContext();
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { consentId, reason } = body;

    if (!consentId) {
      return NextResponse.json(
        { error: 'consentId is required' },
        { status: 400 },
      );
    }

    const result = await ctx.privacyService.revokeConsent(
      consentId,
      reason || 'User requested revocation',
    );

    return NextResponse.json(result);
  } catch (err: any) {
    const message = err.message || 'Failed to revoke consent';
    // Return 404 for consent records that don't exist
    if (message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    // Return 409 for already-revoked consent
    if (message.includes('already revoked') || message.includes('already withdrawn')) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
