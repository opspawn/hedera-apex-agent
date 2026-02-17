import { NextResponse } from 'next/server';
import { getServerContextSync } from '@/lib/server';

const VERSION = '1.0.0';
const STANDARDS = ['HCS-10', 'HCS-11', 'HCS-14', 'HCS-19', 'HCS-20', 'HCS-26'];

export async function GET() {
  const ctx = getServerContextSync();
  return NextResponse.json({
    status: 'ok',
    version: VERSION,
    uptime: Math.floor((Date.now() - ctx.startTime) / 1000),
    network: ctx.config.hedera.network,
    account: ctx.config.hedera.accountId,
    standards: STANDARDS,
    agents: ctx.registry.getCount(),
    testnet: ctx.testnetIntegration.getStatus(),
  });
}
