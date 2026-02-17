import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    name: 'OpSpawn Marketplace Agent',
    description: 'Privacy-preserving AI agent marketplace on Hedera with HCS-10/11/14/19/20/26 standards',
    version: '1.0.0',
    protocols: ['hcs-10', 'a2a-v0.3', 'x402-v2'],
    capabilities: ['agent-discovery', 'agent-hiring', 'skill-publishing', 'reputation-tracking', 'privacy-compliance'],
    endpoints: {
      chat: '/api/chat',
      marketplace: '/api/marketplace/discover',
      register: '/api/marketplace/register',
      hire: '/api/marketplace/hire',
      health: '/api/health',
    },
    hedera: {
      network: 'testnet',
      accountId: '0.0.7854018',
      standards: ['HCS-10', 'HCS-11', 'HCS-14', 'HCS-19', 'HCS-20', 'HCS-26'],
    },
  });
}
