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

  const result = await ctx.marketplace.verifyAndHire({
    clientId,
    agentId,
    skillId,
    input: input || {},
    payerAccount,
  });

  return NextResponse.json(result);
}
