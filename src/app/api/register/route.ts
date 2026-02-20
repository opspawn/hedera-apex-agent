/**
 * Agent Registration API Route
 *
 * POST /api/register — Register a new agent on the HOL Registry Broker.
 * Creates an HCS-11 profile and registers via RegistryBrokerClient.
 * Falls back to direct HCS topic submission if broker registration fails.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/hol/rb-client';

interface RegisterRequest {
  name: string;
  description: string;
  capabilities: string[];
  profile?: {
    display_name?: string;
    bio?: string;
    agent_type?: 'autonomous' | 'manual' | 'hybrid';
    model?: string;
    creator?: string;
    socials?: Array<{ platform: string; handle: string }>;
    website?: string;
  };
  privacy?: {
    data_collected?: string[];
    data_purpose?: string;
    retention_period?: string;
  };
}

export async function POST(request: NextRequest) {
  let body: RegisterRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { name, description, capabilities, profile, privacy } = body;

  if (!name || !description || !capabilities || capabilities.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: name, description, capabilities' },
      { status: 400 }
    );
  }

  const accountId = process.env.HEDERA_ACCOUNT_ID || '0.0.7854018';
  const privateKey = process.env.HEDERA_PRIVATE_KEY || '';

  // Build HCS-11 profile
  const displayName = profile?.display_name || name;
  const bio = profile?.bio || description;
  const agentType = profile?.agent_type || 'autonomous';
  const socials = profile?.socials || [];

  // Attempt Registry Broker registration
  try {
    const client = await getClient();

    const registrationPayload = {
      profile: {
        version: '1.0.0',
        type: 1, // ProfileType.AI_AGENT
        display_name: displayName,
        alias: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        bio,
        properties: {
          tags: capabilities,
          ...(privacy ? {
            privacy_policy: {
              data_collected: privacy.data_collected || [],
              data_purpose: privacy.data_purpose || '',
              retention_period: privacy.retention_period || '30 days',
            },
          } : {}),
        },
        socials,
        aiAgent: {
          type: agentType,
          model: profile?.model || '',
          capabilities,
          creator: profile?.creator || '',
        },
      } as any,
      communicationProtocol: 'hcs-10',
      registry: 'hashgraph-online',
      endpoint: profile?.website || `https://hedera.opspawn.com/api/agents/${encodeURIComponent(name)}`,
      metadata: {
        provider: profile?.creator || 'opspawn',
        version: '0.23.0',
        standards: ['HCS-10', 'HCS-11', 'HCS-19'],
        registered_via: 'hedera-agent-marketplace',
      },
    };

    const result = await client.registerAgent(registrationPayload);

    // Handle async registration (202 pending → poll for completion)
    let finalResult: any = result;
    if (finalResult?.status === 'pending' && finalResult?.attemptId) {
      finalResult = await client.waitForRegistrationCompletion(
        finalResult.attemptId,
        { intervalMs: 2000, timeoutMs: 60000 }
      );
    }

    const uaid = finalResult?.uaid;
    const agentId = finalResult?.agentId;
    const topicIds = finalResult?.topicIds || {
      inbound: finalResult?.inboundTopicId,
      outbound: finalResult?.outboundTopicId,
      profile: finalResult?.profileTopicId,
    };

    return NextResponse.json({
      success: true,
      uaid,
      agentId,
      topicIds,
      method: 'registry-broker',
      name: displayName,
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  } catch (brokerErr: any) {
    console.log(`[register] Registry Broker failed: ${brokerErr.message}, trying direct HCS...`);
  }

  // Fallback: direct HCS topic submission
  if (!privateKey || privateKey === 'your-private-key-here') {
    return NextResponse.json({
      success: false,
      error: 'HEDERA_PRIVATE_KEY not configured and broker registration failed',
    }, { status: 503 });
  }

  try {
    const { Client, TopicMessageSubmitTransaction } = await import('@hashgraph/sdk');
    const hederaClient = Client.forTestnet();
    hederaClient.setOperator(accountId, privateKey);

    const registryTopicId = process.env.REGISTRY_TOPIC_ID || '0.0.7311321';

    const agentProfile = {
      type: 'hcs-11-profile',
      version: '1.0.0',
      display_name: displayName,
      alias: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      bio,
      aiAgent: {
        type: agentType,
        model: profile?.model || '',
        capabilities,
        creator: profile?.creator || '',
      },
      properties: {
        tags: capabilities,
      },
      socials,
      privacy_policy: privacy ? {
        data_collected: privacy.data_collected || [],
        data_purpose: privacy.data_purpose || '',
        retention_period: privacy.retention_period || '30 days',
      } : undefined,
      timestamp: new Date().toISOString(),
    };

    const regTx = new TopicMessageSubmitTransaction()
      .setTopicId(registryTopicId)
      .setMessage(JSON.stringify({
        type: 'hcs-10-registration',
        name: displayName,
        description: bio,
        profile: agentProfile,
        endpoint: profile?.website || `https://hedera.opspawn.com/api/agents/${encodeURIComponent(name)}`,
        protocols: ['hcs-10', 'hcs-11'],
        timestamp: new Date().toISOString(),
      }));

    const regResult = await regTx.execute(hederaClient);
    const regReceipt = await regResult.getReceipt(hederaClient);
    hederaClient.close();

    return NextResponse.json({
      success: true,
      method: 'direct-hcs',
      registrySequence: regReceipt.topicSequenceNumber?.toNumber(),
      agentId: `${registryTopicId}:${regReceipt.topicSequenceNumber?.toNumber()}`,
      name: displayName,
      accountId,
      timestamp: new Date().toISOString(),
    }, { status: 201 });
  } catch (hcsErr: any) {
    return NextResponse.json({
      success: false,
      error: hcsErr.message || 'Registration failed (both broker and direct HCS)',
    }, { status: 500 });
  }
}
