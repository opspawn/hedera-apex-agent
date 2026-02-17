/**
 * HOL Agent Registration Script
 *
 * Registers the OpSpawn Marketplace Agent with the HOL Registry Broker
 * using @hashgraphonline/standards-sdk.
 *
 * Usage: npx tsx src/scripts/register-agent.ts
 */

import 'dotenv/config';

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

  // Step 1: Import the standards SDK
  console.log('Loading @hashgraphonline/standards-sdk...');
  const sdk = await import('@hashgraphonline/standards-sdk');
  console.log('SDK loaded. Available exports:', Object.keys(sdk).slice(0, 15).join(', '));

  // Step 2: Build agent profile (HCS-11 format)
  const agentProfile = {
    version: '1.0',
    type: 'ai_agent',
    display_name: 'OpSpawn Marketplace Agent',
    alias: 'opspawn-marketplace',
    bio: 'Privacy-preserving AI agent marketplace on Hedera with HCS-10 messaging, HCS-19 consent, HCS-26 skill registry, and x402 micropayments',
    properties: {
      tags: ['marketplace', 'agents', 'hedera', 'hcs-10', 'hcs-19', 'hcs-26', 'privacy', 'x402'],
    },
    socials: [
      { platform: 'twitter', handle: '@opspawn' },
      { platform: 'github', handle: 'opspawn' },
    ],
    aiAgent: {
      type: 'autonomous',
      model: 'claude-opus-4-6',
      capabilities: ['agent-discovery', 'agent-hiring', 'skill-publishing', 'reputation-tracking', 'privacy-compliance', 'chat'],
      creator: 'OpSpawn',
    },
  };

  console.log('\nAgent Profile:');
  console.log(JSON.stringify(agentProfile, null, 2));

  // Step 3: Try to use RegistryBrokerClient or HCS10Client from SDK
  try {
    const RegistryBrokerClient = (sdk as any).RegistryBrokerClient;
    if (RegistryBrokerClient) {
      console.log('\nUsing RegistryBrokerClient for registration...');
      const client = new RegistryBrokerClient({
        baseUrl: 'https://hol.org/registry/api/v1',
      });

      // Authenticate with Hedera ledger credentials
      if (typeof client.authenticateWithLedgerCredentials === 'function') {
        await client.authenticateWithLedgerCredentials({
          accountId,
          network: `hedera:${network}`,
          privateKey,
          label: 'OpSpawn Marketplace Agent',
        });
        console.log('Authenticated with Registry Broker');
      }

      // Register agent
      if (typeof client.registerAgent === 'function') {
        const result = await client.registerAgent({
          profile: agentProfile,
          communicationProtocol: 'hcs-10',
          registry: 'hashgraph-online',
          endpoint: 'https://hedera.opspawn.com/api/agent',
          metadata: {
            provider: 'opspawn',
            version: '1.0.0',
            standards: ['HCS-10', 'HCS-11', 'HCS-14', 'HCS-19', 'HCS-20', 'HCS-26'],
          },
        });
        console.log('\nRegistration result:', JSON.stringify(result, null, 2));
        return;
      }
    }
  } catch (err: any) {
    console.log(`RegistryBrokerClient approach: ${err.message}`);
  }

  // Step 4: Fallback — try HCS10Client from the SDK
  try {
    const HCS10Client = (sdk as any).HCS10Client;
    if (HCS10Client) {
      console.log('\nUsing HCS10Client for on-chain registration...');
      const hcs10 = new HCS10Client({
        operatorId: accountId,
        operatorKey: privateKey,
        network,
      });

      // Create or get agent identity
      if (typeof hcs10.createAgent === 'function') {
        const agent = await hcs10.createAgent({
          name: 'OpSpawn Marketplace Agent',
          description: agentProfile.bio,
          capabilities: agentProfile.aiAgent.capabilities,
        });
        console.log('Agent created:', JSON.stringify(agent, null, 2));
      } else if (typeof hcs10.registerAgent === 'function') {
        const agent = await hcs10.registerAgent(agentProfile);
        console.log('Agent registered:', JSON.stringify(agent, null, 2));
      }
      return;
    }
  } catch (err: any) {
    console.log(`HCS10Client approach: ${err.message}`);
  }

  // Step 5: Fallback — direct topic message
  console.log('\nFallback: Using @hashgraph/sdk directly for HCS topic registration...');
  try {
    const { Client, TopicMessageSubmitTransaction } = await import('@hashgraph/sdk');
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const registryTopicId = process.env.REGISTRY_TOPIC_ID || '0.0.7311321';
    const profileTopicId = process.env.PROFILE_TOPIC_ID || '0.0.7854282';

    // Submit profile to profile topic
    const profileMsg = JSON.stringify({
      ...agentProfile,
      type: 'hcs-11-profile',
      timestamp: new Date().toISOString(),
    });

    const profileTx = new TopicMessageSubmitTransaction()
      .setTopicId(profileTopicId)
      .setMessage(profileMsg);
    const profileResult = await profileTx.execute(client);
    const profileReceipt = await profileResult.getReceipt(client);
    console.log(`Profile submitted to ${profileTopicId}, seq: ${profileReceipt.topicSequenceNumber}`);

    // Submit registration to registry topic
    const registrationMsg = JSON.stringify({
      type: 'hcs-10-registration',
      name: 'OpSpawn Marketplace Agent',
      description: agentProfile.bio,
      inbound_topic: process.env.INBOUND_TOPIC_ID || '0.0.7854276',
      outbound_topic: process.env.OUTBOUND_TOPIC_ID || '0.0.7854275',
      profile_topic: profileTopicId,
      endpoint: 'https://hedera.opspawn.com/api/agent',
      protocols: ['hcs-10', 'a2a-v0.3', 'x402-v2'],
      capabilities: agentProfile.aiAgent.capabilities,
      timestamp: new Date().toISOString(),
    });

    const regTx = new TopicMessageSubmitTransaction()
      .setTopicId(registryTopicId)
      .setMessage(registrationMsg);
    const regResult = await regTx.execute(client);
    const regReceipt = await regResult.getReceipt(client);
    console.log(`Registration submitted to ${registryTopicId}, seq: ${regReceipt.topicSequenceNumber}`);

    client.close();
    console.log('\nAgent registration complete!');
  } catch (err: any) {
    console.error('Direct registration failed:', err.message);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
