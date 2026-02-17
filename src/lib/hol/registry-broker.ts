/**
 * HOL Registry Broker Integration
 *
 * Registers the OpSpawn Agent Marketplace in the HOL Registry Broker
 * for cross-protocol discovery. Uses the shared RegistryBrokerClient
 * singleton from rb-client.ts.
 */

import { loadConfig } from '../config';
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
   * Register the agent with the HOL Registry Broker.
   * Uses proper HCS-11 profile format (type: 1 = AI_AGENT).
   */
  async register(): Promise<RegistrationResult> {
    try {
      const client = await getClient();
      const profile = this.buildProfile();
      const endpoint = this.config.agentEndpoint || 'https://hedera.opspawn.com/api/agent';

      const registration = await client.registerAgent({
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
        } as any,
        communicationProtocol: 'hcs-10',
        registry: 'hashgraph-online',
        endpoint,
        metadata: {
          provider: 'opspawn',
          version: '0.19.0',
          standards: ['HCS-10', 'HCS-11', 'HCS-14', 'HCS-19', 'HCS-20', 'HCS-26'],
        },
      });

      this.registrationResult = {
        success: true,
        uaid: (registration as any)?.uaid,
        agentId: (registration as any)?.agentId,
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
