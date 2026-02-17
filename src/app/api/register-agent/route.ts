/**
 * HOL Agent Registration API Route
 *
 * Registers the OpSpawn Marketplace Agent with HOL Registry Broker
 * using real RegistryBrokerClient SDK calls. Falls back to direct
 * HCS topic submission if broker registration fails.
 */

import { NextResponse } from 'next/server';
import { getClient } from '@/lib/hol/rb-client';

let registrationResult: any = null;

export async function POST() {
  const accountId = process.env.HEDERA_ACCOUNT_ID || '0.0.7854018';
  const privateKey = process.env.HEDERA_PRIVATE_KEY || '';
  const network = process.env.HEDERA_NETWORK || 'testnet';

  if (!privateKey || privateKey === 'your-private-key-here') {
    return NextResponse.json({
      success: false,
      error: 'HEDERA_PRIVATE_KEY not configured',
      mode: 'mock',
    }, { status: 503 });
  }

  try {
    const client = await getClient();

    const result = await client.registerAgent({
      profile: {
        version: '1.0.0',
        type: 1, // ProfileType.AI_AGENT (not 'ai_agent')
        display_name: 'OpSpawn Marketplace Agent',
        alias: 'opspawn-marketplace',
        bio: 'Privacy-preserving AI agent marketplace on Hedera with HCS-10/11/14/19/20/26 standards',
        aiAgent: {
          type: 'autonomous',
          model: 'claude-opus-4-6',
          capabilities: ['agent-discovery', 'agent-hiring', 'skill-publishing', 'reputation-tracking', 'privacy-compliance', 'chat'],
          creator: 'OpSpawn',
        },
        properties: {
          tags: ['marketplace', 'agents', 'hedera', 'hcs-10', 'hcs-19', 'hcs-26', 'privacy', 'x402'],
        },
        socials: [
          { platform: 'twitter', handle: '@opspawn' },
          { platform: 'github', handle: 'opspawn' },
        ],
      } as any,
      communicationProtocol: 'hcs-10',
      registry: 'hashgraph-online',
      endpoint: 'https://hedera.opspawn.com/api/agent',
      metadata: {
        provider: 'opspawn',
        version: '0.19.0',
        standards: ['HCS-10', 'HCS-11', 'HCS-14', 'HCS-19', 'HCS-20', 'HCS-26'],
      },
    });

    // Handle async registration (202 response)
    if ((result as any)?.status === 'pending' && (result as any)?.attemptId) {
      const final = await client.waitForRegistrationCompletion((result as any).attemptId, {
        intervalMs: 2000,
        timeoutMs: 60000,
      });
      registrationResult = { success: true, method: 'registry-broker', ...final };
    } else {
      registrationResult = { success: true, method: 'registry-broker', ...result };
    }

    return NextResponse.json(registrationResult);
  } catch (err: any) {
    console.log(`[register-agent] Registry Broker failed: ${err.message}, trying direct HCS...`);
  }

  // Fallback: direct HCS topic submission
  try {
    const { Client, TopicMessageSubmitTransaction } = await import('@hashgraph/sdk');
    const client = Client.forTestnet();
    client.setOperator(accountId, privateKey);

    const profileTopicId = process.env.PROFILE_TOPIC_ID || '0.0.7854282';
    const registryTopicId = process.env.REGISTRY_TOPIC_ID || '0.0.7311321';

    const agentProfile = {
      type: 'hcs-11-profile',
      version: '1.0.0',
      display_name: 'OpSpawn Marketplace Agent',
      alias: 'opspawn-marketplace',
      bio: 'Privacy-preserving AI agent marketplace on Hedera with HCS-10/11/14/19/20/26 standards',
      aiAgent: {
        type: 'autonomous',
        model: 'claude-opus-4-6',
        capabilities: ['agent-discovery', 'agent-hiring', 'skill-publishing', 'reputation-tracking', 'privacy-compliance', 'chat'],
        creator: 'OpSpawn',
      },
      properties: {
        tags: ['marketplace', 'agents', 'hedera', 'hcs-10', 'hcs-19', 'hcs-26', 'privacy', 'x402'],
      },
      socials: [
        { platform: 'twitter', handle: '@opspawn' },
        { platform: 'github', handle: 'opspawn' },
      ],
      timestamp: new Date().toISOString(),
    };

    const profileTx = new TopicMessageSubmitTransaction()
      .setTopicId(profileTopicId)
      .setMessage(JSON.stringify(agentProfile));
    const profileResult = await profileTx.execute(client);
    const profileReceipt = await profileResult.getReceipt(client);

    const regTx = new TopicMessageSubmitTransaction()
      .setTopicId(registryTopicId)
      .setMessage(JSON.stringify({
        type: 'hcs-10-registration',
        name: 'OpSpawn Marketplace Agent',
        description: agentProfile.bio,
        inbound_topic: process.env.INBOUND_TOPIC_ID || '0.0.7854276',
        outbound_topic: process.env.OUTBOUND_TOPIC_ID || '0.0.7854275',
        profile_topic: profileTopicId,
        endpoint: 'https://hedera.opspawn.com/api/agent',
        protocols: ['hcs-10', 'a2a-v0.3', 'x402-v2'],
        timestamp: new Date().toISOString(),
      }));
    const regResult = await regTx.execute(client);
    const regReceipt = await regResult.getReceipt(client);

    client.close();

    registrationResult = {
      success: true,
      method: 'direct-hcs',
      profileSequence: profileReceipt.topicSequenceNumber?.toNumber(),
      registrySequence: regReceipt.topicSequenceNumber?.toNumber(),
      accountId,
      network,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(registrationResult);
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      accountId,
      network,
    }, { status: 500 });
  }
}

export async function GET() {
  if (registrationResult) {
    return NextResponse.json(registrationResult);
  }
  return NextResponse.json({
    registered: false,
    message: 'POST to this endpoint to register the agent',
  });
}
