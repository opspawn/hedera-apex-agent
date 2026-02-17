import { NextResponse } from 'next/server';
import { getServerContext } from '@/lib/server';

export async function POST() {
  const ctx = await getServerContext();

  try {
    const result = await ctx.registryBroker.register();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
