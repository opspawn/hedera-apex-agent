import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';

/**
 * GET /api/privacy/policy?agentId=X — Get agent's privacy policy
 *
 * Returns the privacy policy for a specific agent, including what data
 * is collected, retention periods, sharing policies, and user rights.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      const policies = ctx.privacyService.getAllPolicies();
      return NextResponse.json({
        policies,
        total: policies.length,
        standard: 'HCS-19',
        compliance: ['ISO/IEC TS 27560:2023', 'GDPR', 'CCPA'],
      });
    }

    const policy = ctx.privacyService.getPolicy(agentId);
    if (!policy) {
      return NextResponse.json(
        { error: `No privacy policy found for agent: ${agentId}` },
        { status: 404 },
      );
    }

    return NextResponse.json({ policy });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to get privacy policy' },
      { status: 500 },
    );
  }
}
