import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';

export async function POST(request: NextRequest) {
  const ctx = await getServerContext();
  const body = await request.json();

  const { name, description, skills, endpoint, protocols, payment_address } = body;

  if (!name || !description || !skills || !endpoint) {
    return NextResponse.json({ error: 'Missing required fields: name, description, skills, endpoint' }, { status: 400 });
  }

  const result = await ctx.marketplace.registerAgentWithIdentity({
    name,
    description,
    skills: skills || [],
    endpoint,
    protocols: protocols || ['hcs-10', 'a2a-v0.3'],
    payment_address: payment_address || ctx.config.hedera.accountId,
  });

  return NextResponse.json(result, { status: 201 });
}
