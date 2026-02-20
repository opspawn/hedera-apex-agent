import { NextResponse } from 'next/server';
import { getServerContext, getServerContextSync } from '@/lib/server';

const VERSION = '1.0.0';
const STANDARDS = ['HCS-10', 'HCS-11', 'HCS-14', 'HCS-19', 'HCS-20', 'HCS-26'];

export async function GET() {
  // Use async context so agents are seeded before reporting count
  let ctx;
  try {
    ctx = await getServerContext();
  } catch {
    ctx = getServerContextSync();
  }

  // Report agent count from marketplace (where agents are actually registered)
  const agentCount = ctx.marketplace.getAgentCount() || ctx.registry.getCount();
  const brokerStatus = ctx.registryBroker.getStatus();

  return NextResponse.json({
    status: 'ok',
    version: VERSION,
    uptime: Math.floor((Date.now() - ctx.startTime) / 1000),
    network: ctx.config.hedera.network,
    account: ctx.config.hedera.accountId,
    standards: STANDARDS,
    agents: agentCount,
    testnet: ctx.testnetIntegration.getStatus(),
    registryBroker: {
      registered: brokerStatus.registered,
      uaid: brokerStatus.uaid,
    },
  });
}
