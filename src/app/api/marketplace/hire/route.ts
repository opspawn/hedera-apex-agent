import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';

export async function POST(request: NextRequest) {
  const ctx = await getServerContext();
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { clientId, agentId, skillId, input, payerAccount, skipConsent } = body;

  if (!clientId || !agentId || !skillId) {
    return NextResponse.json({ error: 'Missing required fields: clientId, agentId, skillId' }, { status: 400 });
  }

  // Check agent exists BEFORE consent check to avoid misleading consent_required for nonexistent agents
  const agentProfile = await ctx.marketplace.getAgentProfile(agentId);
  if (!agentProfile) {
    return NextResponse.json(
      { error: 'agent_not_found', message: `No agent registered with ID: ${agentId}`, agent_id: agentId },
      { status: 404 },
    );
  }

  // HCS-19 Privacy Check: Verify consent exists before hiring
  if (!skipConsent) {
    const consentCheck = await ctx.privacyService.checkConsent(clientId, 'service_delivery');
    if (!consentCheck.consented) {
      return NextResponse.json({
        error: 'consent_required',
        message: 'Privacy consent is required before hiring an agent. Grant consent via POST /api/privacy/consent.',
        required_purposes: ['service_delivery'],
        consent_url: '/api/privacy/consent',
        agent_id: agentId,
      }, { status: 403 });
    }
  }

  try {
    const result = await ctx.marketplace.verifyAndHire({
      clientId,
      agentId,
      skillId,
      input: input || {},
      payerAccount,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    // Map known service errors to appropriate HTTP status codes
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'Hire failed', details: message }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Hire failed', details: message },
      { status: 500 },
    );
  }
}
