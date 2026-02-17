import { NextResponse } from 'next/server';
import { getServerContextSync } from '@/lib/server';

export async function GET() {
  const ctx = getServerContextSync();
  return NextResponse.json(ctx.registryBroker.getStatus());
}
