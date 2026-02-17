import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';

/**
 * GET /api/privacy/audit?agentId=X&userId=Y&limit=N — Get consent audit trail
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const entries = ctx.privacyService.getAuditLog({ agentId, userId, limit });

    return NextResponse.json({
      entries,
      total: entries.length,
      standard: 'HCS-19',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to get audit trail' },
      { status: 500 },
    );
  }
}
