import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';

/**
 * GET /api/marketplace/register
 * Returns registration info: how many agents are registered, what fields are required.
 */
export async function GET() {
  const ctx = await getServerContext();
  const agentCount = ctx.marketplace.getAgentCount();

  return NextResponse.json({
    registered_agents: agentCount,
    network: ctx.config.hedera.network,
    account: ctx.config.hedera.accountId,
    required_fields: ['name', 'description', 'skills', 'endpoint'],
    optional_fields: ['protocols', 'payment_address'],
    example: {
      name: 'MyAgent',
      description: 'A helpful AI agent',
      skills: [
        {
          id: 'skill-1',
          name: 'Code Review',
          description: 'Reviews code for bugs and improvements',
          category: 'code review',
          tags: ['code', 'review'],
          input_schema: { type: 'object' },
          output_schema: { type: 'object' },
          pricing: { amount: 1, token: 'HBAR', unit: 'per_call' },
        },
      ],
      endpoint: 'https://my-agent.example.com/a2a',
      protocols: ['hcs-10', 'a2a-v0.3'],
      payment_address: '0.0.12345',
    },
  });
}

/**
 * POST /api/marketplace/register
 * Register a new agent in the marketplace.
 *
 * Body: { name, description, skills[], endpoint, protocols?, payment_address? }
 */
export async function POST(request: NextRequest) {
  const ctx = await getServerContext();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, description, skills, endpoint, protocols, payment_address } = body as {
    name?: string;
    description?: string;
    skills?: unknown[];
    endpoint?: string;
    protocols?: string[];
    payment_address?: string;
  };

  // Validate required fields
  const missing: string[] = [];
  if (!name || typeof name !== 'string') missing.push('name');
  if (!description || typeof description !== 'string') missing.push('description');
  if (!skills || !Array.isArray(skills)) missing.push('skills');
  if (!endpoint || typeof endpoint !== 'string') missing.push('endpoint');

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing or invalid required fields: ${missing.join(', ')}` },
      { status: 400 },
    );
  }

  // Validate skills have at minimum a name
  const validSkills = (skills as any[]).map((s, i) => ({
    id: s.id || `skill-${Date.now()}-${i}`,
    name: s.name || `Skill ${i + 1}`,
    description: s.description || '',
    category: s.category || 'general',
    tags: s.tags || [],
    input_schema: s.input_schema || { type: 'object' },
    output_schema: s.output_schema || { type: 'object' },
    pricing: s.pricing || { amount: 0, token: 'HBAR', unit: 'per_call' },
  }));

  try {
    const result = await ctx.marketplace.registerAgentWithIdentity({
      name: name!,
      description: description!,
      skills: validSkills,
      endpoint: endpoint!,
      protocols: protocols || ['hcs-10', 'a2a-v0.3'],
      payment_address: payment_address || ctx.config.hedera.accountId,
    });

    return NextResponse.json({
      success: true,
      agent_id: result.agent.agent_id,
      name: result.agent.name,
      status: result.agent.status,
      verification: result.verificationStatus,
      skills_published: result.publishedSkills.length,
      inbound_topic: result.agent.inbound_topic,
      outbound_topic: result.agent.outbound_topic,
      profile_topic: result.agent.profile_topic,
      registered_at: result.agent.registered_at,
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: 'Registration failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
