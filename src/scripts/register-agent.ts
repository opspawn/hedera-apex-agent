/**
 * HOL Agent Registration Script
 *
 * Registers the OpSpawn Marketplace Agent with the HOL Registry Broker
 * using @hashgraphonline/standards-sdk RegistryBrokerClient.
 *
 * Usage: npx tsx src/scripts/register-agent.ts
 */

import 'dotenv/config';

const AGENT_PROFILE = {
  version: '1.0.0',
  type: 1, // AI_AGENT
  display_name: 'OpSpawn Agent Marketplace',
  alias: 'opspawn-marketplace',
  bio: 'Privacy-preserving AI agent marketplace on Hedera. Discover, hire, and interact with AI agents via HCS-10 messaging, HCS-19 consent, HCS-26 skills, HCS-20 reputation, and x402 micropayments.',
  properties: {
    tags: ['marketplace', 'agents', 'hedera', 'hcs-10', 'hcs-19', 'hcs-26', 'hcs-20', 'privacy', 'x402', 'a2a'],
  },
  socials: [
    { platform: 'twitter', handle: '@opspawn' },
    { platform: 'github', handle: 'opspawn' },
    { platform: 'website', handle: 'https://hedera.opspawn.com' },
  ],
  aiAgent: {
    type: 'autonomous',
    model: 'claude-opus-4-6',
    capabilities: [
      'agent-discovery',
      'agent-hiring',
      'skill-publishing',
      'reputation-tracking',
      'privacy-compliance',
      'chat',
      'credit-management',
    ],
    creator: 'OpSpawn',
  },
};

async function main() {
  const accountId = process.env.HEDERA_ACCOUNT_ID || '0.0.7854018';
  const privateKey = process.env.HEDERA_PRIVATE_KEY || '';
  const network = (process.env.HEDERA_NETWORK || 'testnet') as 'testnet' | 'mainnet';

  if (!privateKey) {
    console.error('ERROR: HEDERA_PRIVATE_KEY not set. Create a .env.local file.');
    process.exit(1);
  }

  console.log(`\n=== HOL Agent Registration ===`);
  console.log(`Account: ${accountId}`);
  console.log(`Network: ${network}`);
  console.log();

  const {
    RegistryBrokerClient,
    isSuccessRegisterAgentResponse,
    isPendingRegisterAgentResponse,
  } = await import('@hashgraphonline/standards-sdk');

  const client = new RegistryBrokerClient({
    baseUrl: 'https://hol.org/registry/api/v1',
    accountId,
  });

  console.log('Authenticating with ledger credentials...');
  await client.authenticateWithLedgerCredentials({
    accountId,
    network: `hedera:${network}`,
    hederaPrivateKey: privateKey,
    expiresInMinutes: 30,
    label: 'OpSpawn Marketplace',
  });
  console.log('Authenticated!\n');

  console.log('Registering agent...');
  const result = await client.registerAgent(
    {
      profile: AGENT_PROFILE as any,
      protocol: 'https',
      registry: 'hashgraph-online',
      endpoint: 'https://hedera.opspawn.com/api/agent',
      metadata: {
        provider: 'opspawn',
        version: '1.0.0',
        nativeId: 'hedera.opspawn.com',
        category: 'marketplace',
        openConvAICompatible: true,
        customFields: {
          network,
          nativeId: `hedera:${network}:${accountId}`,
          accountId,
          inboundTopicId: process.env.INBOUND_TOPIC_ID || '0.0.7854276',
          outboundTopicId: process.env.OUTBOUND_TOPIC_ID || '0.0.7854275',
          profileTopicId: process.env.PROFILE_TOPIC_ID || '0.0.7854282',
          standards: 'HCS-10,HCS-11,HCS-14,HCS-19,HCS-20,HCS-26',
        },
      },
    },
    {
      autoTopUp: { accountId, privateKey, memo: 'OpSpawn Registration' },
    },
  );

  console.log('\nRegistration result:', JSON.stringify(result, null, 2));

  if (isSuccessRegisterAgentResponse(result)) {
    console.log(`\nSUCCESS! UAID: ${result.uaid}`);
    console.log(`Agent ID: ${(result as any).agentId}`);
  } else if (isPendingRegisterAgentResponse(result)) {
    console.log('\nPending — waiting for confirmation...');
    const final = await client.waitForRegistrationCompletion((result as any).registrationId, {
      intervalMs: 5000,
      timeoutMs: 120000,
      onProgress: (p) => console.log(`  ${p.status}: ${(p as any).message || ''}`),
    });
    console.log('\nFinal result:', JSON.stringify(final, null, 2));
  }

  // Verify in search
  console.log('\nVerifying in search...');
  try {
    const search = await fetch(
      'https://hol.org/registry/api/v1/search?q=opspawn-marketplace&limit=1',
    );
    const data = await search.json();
    if (data.hits?.length > 0) {
      console.log('FOUND in Registry Broker!');
      console.log(`  Name: ${data.hits[0].name}`);
      console.log(`  UAID: ${data.hits[0].uaid}`);
      console.log(`  Registry: ${data.hits[0].registry}`);
    } else {
      console.log('Not yet indexed (may take a minute)');
    }
  } catch {
    console.log('Search verification skipped');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
