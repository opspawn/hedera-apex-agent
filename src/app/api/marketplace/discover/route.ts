/**
 * Agent Discovery API Route
 *
 * Searches for agents using HOL Registry Broker (keyword + vector search)
 * with fallback to local marketplace data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';
import { getClient } from '@/lib/hol/rb-client';

export async function GET(request: NextRequest) {
  const ctx = await getServerContext();
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q') || undefined;
  const category = searchParams.get('category') || undefined;
  const tags = searchParams.get('tags')?.split(',') || undefined;
  const verifiedOnly = searchParams.get('verified') === 'true';
  const minReputation = searchParams.get('minReputation') ? parseInt(searchParams.get('minReputation')!) : undefined;
  const status = searchParams.get('status') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;
  const mode = searchParams.get('mode') || 'hybrid'; // 'local', 'broker', 'hybrid'

  // Try Registry Broker search first (if query provided and mode allows)
  if (q && mode !== 'local') {
    try {
      const client = await getClient();

      // Keyword search via Registry Broker
      const brokerResult = await client.search({
        q,
        registry: 'hashgraph-online',
        verified: verifiedOnly || undefined,
        limit,
        page: Math.floor(offset / limit) + 1,
        sortBy: 'most-recent',
      } as any);

      const hits = (brokerResult as any)?.hits || [];
      const total = (brokerResult as any)?.total || hits.length;

      // Map broker hits to our format
      const brokerAgents = hits.map((hit: any) => ({
        agent_id: hit.uaid || hit.id || 'unknown',
        name: hit.name || hit.display_name || 'Unknown Agent',
        description: hit.description || hit.bio || '',
        uaid: hit.uaid,
        endpoint: hit.endpoints?.primary || hit.endpoints?.api || hit.endpoint || '',
        protocols: hit.protocols || ['hcs-10'],
        capabilities: hit.capabilities || [],
        trust_score: hit.trustScore || 0,
        registry: hit.registry || 'hashgraph-online',
        available: hit.available || false,
        source: 'registry-broker',
      }));

      // In hybrid mode, merge with local results
      if (mode === 'hybrid') {
        const localResult = await ctx.marketplace.discoverAgents({
          q, category, tags, verifiedOnly, minReputation, status, limit, offset,
        });

        return NextResponse.json({
          agents: brokerAgents,
          localAgents: localResult.agents,
          total: total + localResult.total,
          source: 'hybrid',
          brokerTotal: total,
          localTotal: localResult.total,
        });
      }

      return NextResponse.json({
        agents: brokerAgents,
        total,
        source: 'registry-broker',
      });
    } catch (err: any) {
      console.error('[discover] Broker search failed, falling back to local:', err.message);
    }
  }

  // Fallback: local marketplace search
  const result = await ctx.marketplace.discoverAgents({
    q, category, tags, verifiedOnly, minReputation, status, limit, offset,
  });

  return NextResponse.json({
    ...result,
    source: 'local',
  });
}

/**
 * POST: Vector/semantic search via Registry Broker
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10, filter } = body as {
      query: string;
      limit?: number;
      filter?: Record<string, any>;
    };

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const client = await getClient();
    const result = await client.vectorSearch({
      query,
      limit,
      filter,
    });

    const hits = (result as any)?.hits || (result as any)?.results || [];

    return NextResponse.json({
      agents: hits.map((hit: any) => {
        // Vector search wraps results in hit.agent
        const agent = hit.agent || hit;
        return {
          agent_id: agent.uaid || agent.id || 'unknown',
          name: agent.display_name || agent.name || 'Unknown Agent',
          description: agent.bio || agent.description || '',
          uaid: agent.uaid,
          endpoint: agent.endpoints?.primary || agent.endpoint || '',
          similarity: hit.score || hit.similarity || 0,
          registry: agent.registry || 'unknown',
          source: 'vector-search',
        };
      }),
      total: hits.length,
      source: 'vector-search',
    });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Vector search failed',
      details: err.message,
      source: 'vector-search',
    }, { status: 500 });
  }
}
