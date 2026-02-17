import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';

export async function GET(request: NextRequest) {
  const ctx = await getServerContext();
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;

  const leaderboard = ctx.hcs20.getLeaderboard(limit);
  return NextResponse.json({ leaderboard });
}
