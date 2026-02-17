/**
 * Chat Status API Route
 *
 * Returns the configuration status of the chat system,
 * including Registry Broker relay availability.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const hederaConfigured = !!(process.env.HEDERA_ACCOUNT_ID && process.env.HEDERA_PRIVATE_KEY);

  return NextResponse.json({
    configured: true,
    provider: 'marketplace-responder',
    hederaConfigured,
    agentReady: true,
    marketplaceAware: true,
    brokerRelayAvailable: hederaConfigured,
    modes: ['local', 'broker'],
    error: null,
  });
}
