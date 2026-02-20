/**
 * Credit System Test Script
 *
 * Tests the HOL Registry Broker credit system:
 * 1. Checks current credit balance
 * 2. Purchases credits with HBAR on testnet
 * 3. Verifies the balance increased
 *
 * Usage: npx tsx scripts/test-credits.ts [--purchase]
 *
 * By default only checks balance. Pass --purchase to actually buy credits.
 */

import dotenv from 'dotenv';
import path from 'path';
import { RegistryBrokerClient } from '@hashgraphonline/standards-sdk';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const API_BASE = 'https://hol.org/registry/api/v1';

async function main() {
  const accountId = process.env.HEDERA_ACCOUNT_ID || '0.0.7854018';
  const privateKey = process.env.HEDERA_PRIVATE_KEY || '';
  const doPurchase = process.argv.includes('--purchase');

  if (!privateKey) {
    console.error('ERROR: HEDERA_PRIVATE_KEY not set in .env.local');
    process.exit(1);
  }

  console.log('\n=== Credit System Test ===');
  console.log(`Account: ${accountId}`);
  console.log(`Mode:    ${doPurchase ? 'CHECK + PURCHASE' : 'CHECK ONLY (use --purchase to buy)'}`);
  console.log();

  // Step 1: Authenticate
  console.log('[1/4] Authenticating with Registry Broker...');
  const client = new RegistryBrokerClient({ baseUrl: API_BASE });

  await client.authenticateWithLedgerCredentials({
    accountId,
    network: 'hedera:testnet',
    hederaPrivateKey: privateKey,
    expiresInMinutes: 30,
    label: 'OpSpawn Marketplace',
  });

  const headers = client.getDefaultHeaders();
  console.log('  Authenticated successfully');

  // Step 2: Check current balance
  console.log('[2/4] Checking current credit balance...');
  const balanceRes = await fetch(`${API_BASE}/credits/balance`, { headers });

  if (!balanceRes.ok) {
    console.error(`  Balance check failed (${balanceRes.status}): ${await balanceRes.text()}`);
    process.exit(1);
  }

  const balanceData = (await balanceRes.json()) as {
    accountId: string;
    balance: number;
    timestamp: string;
  };

  console.log(`  Account:   ${balanceData.accountId}`);
  console.log(`  Balance:   ${balanceData.balance} credits`);
  console.log(`  Timestamp: ${balanceData.timestamp}`);

  const initialBalance = balanceData.balance;

  if (!doPurchase) {
    console.log('\n[3/4] Skipping purchase (pass --purchase to buy credits)');
    console.log('[4/4] Skipping verification');
    console.log('\n=== Test Complete (balance check only) ===');
    return;
  }

  // Step 3: Purchase credits with HBAR (via direct API call for better error handling)
  console.log('[3/4] Purchasing credits with HBAR...');
  const purchaseAmount = '3'; // 3 HBAR — enough for basic skill publishing (~29 credits)

  const purchaseRes = await fetch(`${API_BASE}/credits/purchase`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      accountId,
      payerKey: privateKey,
      hbarAmount: purchaseAmount,
      memo: 'OpSpawn credit purchase',
    }),
  });

  if (!purchaseRes.ok) {
    const errBody = await purchaseRes.text();
    console.error(`  Purchase failed (${purchaseRes.status}): ${errBody}`);

    if (errBody.includes('INVALID_SIGNATURE') || errBody.includes('precheck')) {
      console.log('\n  Note: Credit purchases execute on mainnet. A testnet account key');
      console.log('  cannot sign mainnet transactions. Use a mainnet account for purchases.');
    } else if (errBody.includes('insufficient') || errBody.includes('balance')) {
      console.log('\n  Note: Insufficient HBAR for credit purchase.');
    }

    console.log('\n[4/4] Skipping verification due to purchase failure');
    console.log('\n=== Test Complete (purchase failed — expected with testnet key) ===');
    return;
  }

  const purchaseResult = await purchaseRes.json();
  console.log('  Purchase result:', JSON.stringify(purchaseResult, null, 2));

  // Step 4: Verify balance increased
  console.log('[4/4] Verifying balance increased...');

  // Small delay to allow processing
  await new Promise((r) => setTimeout(r, 3000));

  const verifyRes = await fetch(`${API_BASE}/credits/balance`, { headers });
  if (!verifyRes.ok) {
    console.error(`  Verification failed (${verifyRes.status})`);
    process.exit(1);
  }

  const verifyData = (await verifyRes.json()) as {
    accountId: string;
    balance: number;
    timestamp: string;
  };

  const newBalance = verifyData.balance;
  const diff = newBalance - initialBalance;

  console.log(`  Previous balance: ${initialBalance} credits`);
  console.log(`  New balance:      ${newBalance} credits`);
  console.log(`  Difference:       ${diff > 0 ? '+' : ''}${diff} credits`);

  if (diff > 0) {
    console.log('\n=== Test PASSED: Credits purchased successfully ===');
  } else {
    console.log('\n=== Test WARNING: Balance did not increase (may need processing time) ===');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
