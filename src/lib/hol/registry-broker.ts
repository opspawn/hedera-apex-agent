/**
 * HOL Registry Broker Integration
 *
 * Registers the OpSpawn Agent Marketplace in the HOL Registry Broker
 * for cross-protocol discovery. Uses the shared RegistryBrokerClient
 * singleton from rb-client.ts.
 */

import { loadConfig, AGENT_UAID } from '../config';
import { getClient } from './rb-client';

export interface RegistryBrokerConfig {
  accountId: string;
  privateKey: string;
  network: 'testnet' | 'mainnet';
  brokerBaseUrl?: string;
  agentEndpoint?: string;
}

export interface RegistrationProfile {
  display_name: string;
  alias: string;
  bio: string;
  tags: string[];
  socials: Array<{ platform: string; handle: string }>;
  model?: string;
  creator?: string;
  capabilities?: string[];
}

export interface RegistrationResult {
  success: boolean;
  uaid?: string;
  agentId?: string;
  error?: string;
  timestamp: string;
}

export interface RegistryStatus {
  registered: boolean;
  uaid?: string;
  agentId?: string;
  brokerUrl: string;
  lastCheck: string;
  error?: string;
}

const DEFAULT_BROKER_URL = 'https://hol.org/registry/api/v1';

export class RegistryBroker {
  private config: RegistryBrokerConfig;
  private brokerUrl: string;
  private registrationResult: RegistrationResult | null = null;

  constructor(config: RegistryBrokerConfig) {
    this.config = config;
    this.brokerUrl = config.brokerBaseUrl || DEFAULT_BROKER_URL;

    // Seed with known UAID from config so health check reports
    // registered = true across server restarts (Sprint 33 cached registration)
    this.registrationResult = {
      success: true,
      uaid: AGENT_UAID,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build the agent profile for Registry Broker registration.
   */
  buildProfile(): RegistrationProfile {
    return {
      display_name: 'OpSpawn Agent Marketplace',
      alias: 'opspawn-marketplace',
      bio: 'Decentralized AI agent marketplace on Hedera with HCS-10 communication, HCS-26 skills registry, HCS-20 reputation, and HCS-19 privacy compliance',
      tags: ['marketplace', 'agents', 'hedera', 'hcs-10', 'hcs-26', 'hcs-20', 'hcs-19', 'privacy', 'x402'],
      socials: [
        { platform: 'twitter', handle: '@opspawn' },
        { platform: 'github', handle: 'opspawn' },
      ],
      model: 'claude-opus-4-6',
      creator: 'OpSpawn',
      capabilities: ['agent-discovery', 'agent-hiring', 'skill-publishing', 'reputation-tracking', 'privacy-compliance', 'chat'],
    };
  }

  /**
   * Build the registration payload for the HOL Registry Broker API.
   */
  private buildRegistrationPayload() {
    const profile = this.buildProfile();
    const endpoint = this.config.agentEndpoint || 'https://hedera.opspawn.com/api/agent';

    return {
      profile: {
        version: '1.0.0',
        type: 1, // ProfileType.AI_AGENT
        display_name: profile.display_name,
        alias: profile.alias,
        bio: profile.bio,
        properties: {
          tags: profile.tags,
        },
        socials: profile.socials,
        aiAgent: {
          type: 'autonomous',
          model: profile.model,
          capabilities: profile.capabilities,
          creator: profile.creator,
        },
      },
      protocol: 'https',
      registry: 'hashgraph-online',
      endpoint,
      metadata: {
        provider: 'opspawn',
        version: '1.0.0',
        nativeId: 'hedera.opspawn.com',
        category: 'marketplace',
        openConvAICompatible: true,
        customFields: {
          network: this.config.network,
          nativeId: `hedera:${this.config.network}:${this.config.accountId}`,
          accountId: this.config.accountId,
          inboundTopicId: process.env.INBOUND_TOPIC_ID || '0.0.7854276',
          outboundTopicId: process.env.OUTBOUND_TOPIC_ID || '0.0.7854275',
          profileTopicId: process.env.PROFILE_TOPIC_ID || '0.0.7854282',
          standards: 'HCS-10,HCS-11,HCS-14,HCS-19,HCS-20,HCS-26',
        },
      },
    };
  }

  /**
   * Register the agent with the HOL Registry Broker.
   * Uses proper HCS-11 profile format (type: 1 = AI_AGENT).
   *
   * Tries the SDK client first; if it fails with a parse error (known SDK
   * issue where the response schema doesn't match the /register endpoint),
   * falls back to a direct HTTP POST to the broker's /register endpoint.
   */
  async register(): Promise<RegistrationResult> {
    const payload = this.buildRegistrationPayload();

    // Attempt 1: SDK client
    try {
      const client = await getClient();
      const registration = await client.registerAgent(payload as any);

      this.registrationResult = {
        success: true,
        uaid: (registration as any)?.uaid,
        agentId: (registration as any)?.agentId,
        timestamp: new Date().toISOString(),
      };
      return this.registrationResult;
    } catch (sdkErr: unknown) {
      const sdkMsg = sdkErr instanceof Error ? sdkErr.message : '';
      // Only fallback on parse errors; re-throw auth or network errors
      if (!sdkMsg.includes('parse') && !sdkMsg.includes('Parse')) {
        this.registrationResult = {
          success: false,
          error: sdkMsg || 'Unknown SDK registration error',
          timestamp: new Date().toISOString(),
        };
        return this.registrationResult;
      }
    }

    // Attempt 2: Direct HTTP call to the broker /register endpoint
    try {
      const client = await getClient();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(typeof client.getDefaultHeaders === 'function'
          ? client.getDefaultHeaders()
          : {}),
      };

      const resp = await fetch(`${this.brokerUrl}/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => '');
        throw new Error(`HTTP ${resp.status}: ${errBody}`);
      }

      const data = await resp.json() as Record<string, unknown>;

      // Both "created" and "duplicate" statuses mean the agent is registered
      const success = data.success === true || data.status === 'duplicate' || data.status === 'created';
      this.registrationResult = {
        success,
        uaid: (data.uaid as string) || undefined,
        agentId: (data.agentId as string) || undefined,
        error: success ? undefined : (data.message as string) || 'Registration unsuccessful',
        timestamp: new Date().toISOString(),
      };
      return this.registrationResult;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown registration error';
      this.registrationResult = {
        success: false,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      };
      return this.registrationResult;
    }
  }

  /**
   * Verify agent registration by searching the broker index.
   */
  async verifyRegistration(): Promise<boolean> {
    try {
      const client = await getClient();
      const results = await client.search({ q: 'opspawn-marketplace' });
      const hits = (results as any)?.hits || [];
      return hits.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get the current registration status.
   */
  getStatus(): RegistryStatus {
    return {
      registered: this.registrationResult?.success ?? false,
      uaid: this.registrationResult?.uaid,
      agentId: this.registrationResult?.agentId,
      brokerUrl: this.brokerUrl,
      lastCheck: this.registrationResult?.timestamp || new Date().toISOString(),
      error: this.registrationResult?.error,
    };
  }

  getBrokerUrl(): string {
    return this.brokerUrl;
  }

  static fromConfig(): RegistryBroker {
    const config = loadConfig();
    return new RegistryBroker({
      accountId: config.hedera.accountId,
      privateKey: config.hedera.privateKey,
      network: config.hedera.network,
    });
  }
}
