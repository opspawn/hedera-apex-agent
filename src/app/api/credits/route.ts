/**
 * Credits API Route
 *
 * GET: Check credit balance via HOL Registry Broker
 * POST: Purchase credits via HBAR
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/hol/rb-client';

/**
 * GET /api/credits?accountId=...
 * Check credit balance for the authenticated account.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId') || process.env.HEDERA_ACCOUNT_ID || '0.0.7854018';

  try {
    const client = await getClient();
    const balance = await client.requestJson(`/credits/balance?accountId=${accountId}`, {
      method: 'GET',
    });

    return NextResponse.json({
      accountId,
      balance,
      source: 'registry-broker',
    });
  } catch {
    return NextResponse.json({
      accountId,
      balance: { credits: 0, available: true },
      source: 'fallback',
    });
  }
}

/**
 * POST /api/credits
 * Body: { hbarAmount, memo }
 * Purchase credits via HBAR transfer.
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { hbarAmount = 0.75, memo } = body as {
    hbarAmount?: number;
    memo?: string;
  };

  const accountId = process.env.HEDERA_ACCOUNT_ID || '0.0.7854018';
  const privateKey = process.env.HEDERA_PRIVATE_KEY || '';

  if (!privateKey || privateKey === 'your-private-key-here') {
    return NextResponse.json({
      error: 'HEDERA_PRIVATE_KEY not configured',
    }, { status: 503 });
  }

  try {
    const client = await getClient();
    const result = await client.purchaseCreditsWithHbar({
      accountId,
      privateKey,
      hbarAmount,
      memo: memo || 'opspawn-marketplace-credits',
      metadata: { reason: 'marketplace-operations' },
    });

    return NextResponse.json({
      success: true,
      purchase: result,
      accountId,
      hbarAmount,
      source: 'registry-broker',
    });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Failed to purchase credits',
      details: err.message,
      accountId,
    }, { status: 500 });
  }
}
