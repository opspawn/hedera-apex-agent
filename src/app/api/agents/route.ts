import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';

export async function GET(request: NextRequest) {
  const ctx = await getServerContext();
  const { searchParams } = new URL(request.url);

  const result = await ctx.registry.searchAgents({
    q: searchParams.get('q') || undefined,
    category: searchParams.get('category') || undefined,
    status: searchParams.get('status') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
  });

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const ctx = await getServerContext();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description, skills, endpoint, protocols, payment_address } = body;
  if (!name || !description || !skills || !endpoint) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const agent = await ctx.registry.register({
    name,
    description,
    skills,
    endpoint,
    protocols: protocols || ['hcs-10'],
    payment_address: payment_address || ctx.config.hedera.accountId,
  });

  return NextResponse.json(agent, { status: 201 });
}
