/**
 * Skills Search API Route (HCS-26)
 *
 * Searches for skills via HOL Registry Broker's HCS-26 skill registry,
 * with fallback to local skill data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';
import { getClient } from '@/lib/hol/rb-client';

export async function GET(request: NextRequest) {
  const ctx = await getServerContext();
  const { searchParams } = new URL(request.url);

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || undefined;
  const tag = searchParams.get('tag') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20;
  const featured = searchParams.get('featured') === 'true';
  const source = searchParams.get('source') || 'hybrid'; // 'local', 'broker', 'hybrid'

  // Try Registry Broker skills API
  if (source !== 'local') {
    try {
      const client = await getClient();
      const brokerSkills = await client.listSkills({
        name: q || undefined,
        limit,
        tag: tag || undefined,
        category: category || undefined,
        featured: featured || undefined,
        includeFiles: true,
      } as any);

      const skills = (brokerSkills as any)?.skills || (brokerSkills as any)?.results || brokerSkills;
      const skillsArray = Array.isArray(skills) ? skills : [];

      if (source === 'broker' || skillsArray.length > 0) {
        // In hybrid mode, also include local results
        if (source === 'hybrid') {
          const localResult = await ctx.hcs26.discoverSkills(category ? `${q} ${category}` : q);
          return NextResponse.json({
            brokerSkills: skillsArray,
            localSkills: localResult,
            source: 'hybrid',
          });
        }

        return NextResponse.json({
          skills: skillsArray,
          total: skillsArray.length,
          source: 'registry-broker',
        });
      }
    } catch (err: any) {
      console.error('[skills] Broker search failed, falling back to local:', err.message);
    }
  }

  // Fallback: local skill discovery
  const result = await ctx.hcs26.discoverSkills(category ? `${q} ${category}` : q);
  return NextResponse.json({
    ...result,
    source: 'local',
  });
}
