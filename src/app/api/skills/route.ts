/**
 * Skills List API Route (HCS-26)
 *
 * Lists all published skills from the HCS-26 skill registry.
 * GET /api/skills — returns all locally published skills + marketplace metadata.
 * Supports optional filtering by category, tag, and pagination via limit/offset.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';

export async function GET(request: NextRequest) {
  const ctx = await getServerContext();
  const { searchParams } = new URL(request.url);

  const category = searchParams.get('category') || undefined;
  const tag = searchParams.get('tag') || undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0;

  // Get all locally published skills from HCS-26 registry
  let skills = await ctx.hcs26.listPublishedSkills();

  // Filter by category if provided
  if (category) {
    const cat = category.toLowerCase();
    skills = skills.filter(s =>
      s.manifest.skills.some(sk => sk.category.toLowerCase() === cat),
    );
  }

  // Filter by tag if provided
  if (tag) {
    const t = tag.toLowerCase();
    skills = skills.filter(s =>
      (s.manifest.tags || []).some(mt => mt.toLowerCase() === t) ||
      s.manifest.skills.some(sk => sk.tags.some(st => st.toLowerCase() === t)),
    );
  }

  const total = skills.length;
  const paged = skills.slice(offset, offset + limit);

  return NextResponse.json({
    skills: paged,
    total,
    offset,
    limit,
    published_count: ctx.hcs26.getPublishedCount(),
    registry: {
      broker_url: ctx.hcs26.getBrokerUrl(),
      standard: 'HCS-26',
    },
  });
}
