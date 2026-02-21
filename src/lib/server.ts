/**
 * Shared server singleton — initializes marketplace services once.
 * Used by Next.js API routes to access HCS modules, marketplace, chat, etc.
 */

import { loadConfig } from './config';
import { HCS10Client } from './hcs/hcs10-client';
import { HCS11ProfileManager } from './hcs/hcs11-profile';
import { HCS14IdentityManager } from './hcs/hcs14-identity';
import { HCS19PrivacyManager } from './hcs/hcs19-privacy';
import { HCS26SkillRegistry } from './hcs/hcs26';
import { HCS19AgentIdentity } from './hcs/hcs19';
import { HCS20PointsTracker } from './hcs-20/hcs20-points';
import { AgentRegistry } from './marketplace/agent-registry';
import { MarketplaceService } from './marketplace/marketplace-service';
import { TestnetIntegration } from './hedera/testnet-integration';
import { RegistryBroker } from './hol/registry-broker';
import { ConnectionHandler } from './hol/connection-handler';
import { seedDemoAgents } from './seed';
import { PrivacyService, createDefaultPolicy } from './hcs19';
import type { RegisteredAgent } from './types';
import type { MarketplaceContext } from './chat/chat-server';

const START_TIME = Date.now();

interface ServerContext {
  config: ReturnType<typeof loadConfig>;
  hcs10: HCS10Client;
  hcs11: HCS11ProfileManager;
  hcs14: HCS14IdentityManager;
  hcs19: HCS19PrivacyManager;
  hcs19Identity: HCS19AgentIdentity;
  hcs26: HCS26SkillRegistry;
  hcs20: HCS20PointsTracker;
  registry: AgentRegistry;
  marketplace: MarketplaceService;
  testnetIntegration: TestnetIntegration;
  registryBroker: RegistryBroker;
  connectionHandler: ConnectionHandler;
  privacyService: PrivacyService;
  chatMarketplaceCtx: MarketplaceContext;
  startTime: number;
  seeded: boolean;
}

let _ctx: ServerContext | null = null;
let _initPromise: Promise<ServerContext> | null = null;

function createContext(): ServerContext {
  const config = loadConfig();

  const testnetIntegration = new TestnetIntegration({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
  });

  const hcs10 = new HCS10Client({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
    registryTopicId: config.topics.registry,
  }, testnetIntegration);

  const hcs11 = new HCS11ProfileManager({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
  });

  const hcs14 = new HCS14IdentityManager({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
  });

  const hcs19 = new HCS19PrivacyManager({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
  });

  const hcs26 = new HCS26SkillRegistry({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
  });

  const hcs19Identity = new HCS19AgentIdentity({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
  });

  const hcs20 = new HCS20PointsTracker({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
  });

  // HCS-19 Privacy Service (unified facade)
  const privacyService = new PrivacyService({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
  });

  const registry = new AgentRegistry(hcs10, hcs11, hcs14);
  const marketplace = new MarketplaceService(hcs10, hcs11, hcs14, hcs19Identity, hcs26);

  const registryBroker = new RegistryBroker({
    accountId: config.hedera.accountId,
    privateKey: config.hedera.privateKey,
    network: config.hedera.network,
  });

  const connectionHandler = new ConnectionHandler({
    inboundTopicId: config.topics.inbound,
    outboundTopicId: config.topics.outbound,
    accountId: config.hedera.accountId,
  }, hcs10);

  const chatMarketplaceCtx: MarketplaceContext = {
    getAgents: () => {
      const agents: RegisteredAgent[] = [];
      const seen = new Set<string>();
      try {
        const allAgents = (marketplace as any)?.agents;
        if (allAgents instanceof Map) {
          for (const a of allAgents.values()) {
            if (!seen.has(a.agent_id)) {
              agents.push(a);
              seen.add(a.agent_id);
            }
          }
        }
      } catch { /* ignore */ }
      return agents;
    },
    getAgent: (id: string) => {
      try {
        const allAgents = (marketplace as any)?.agents;
        if (allAgents instanceof Map) {
          return allAgents.get(id) || null;
        }
      } catch { /* ignore */ }
      return null;
    },
    searchAgents: (q: string) => {
      const lower = q.toLowerCase();
      try {
        const allAgents = (marketplace as any)?.agents;
        if (allAgents instanceof Map) {
          return Array.from(allAgents.values() as Iterable<RegisteredAgent>).filter(
            (a: RegisteredAgent) =>
              a.name.toLowerCase().includes(lower) ||
              a.description.toLowerCase().includes(lower) ||
              a.skills.some((s: any) =>
                s.name.toLowerCase().includes(lower) ||
                (s.tags || []).some((t: string) => t.toLowerCase().includes(lower))
              ),
          );
        }
      } catch { /* ignore */ }
      return [];
    },
  };

  return {
    config,
    hcs10,
    hcs11,
    hcs14,
    hcs19,
    hcs19Identity,
    hcs26,
    hcs20,
    registry,
    marketplace,
    testnetIntegration,
    registryBroker,
    connectionHandler,
    privacyService,
    chatMarketplaceCtx,
    startTime: START_TIME,
    seeded: false,
  };
}

/**
 * Get the initialized server context. Seeds demo agents on first call.
 */
export async function getServerContext(): Promise<ServerContext> {
  if (_ctx && _ctx.seeded) return _ctx;

  if (!_initPromise) {
    _initPromise = (async () => {
      if (!_ctx) {
        _ctx = createContext();
      }
      if (!_ctx.seeded) {
        try {
          const seedResult = await seedDemoAgents(_ctx.marketplace, _ctx.hcs19, _ctx.hcs20);
          console.log(`[server] Seeded ${seedResult.seeded} demo agents`);

          // Register default privacy policies for seeded agents
          for (const agent of seedResult.agents) {
            _ctx.privacyService.registerPolicy(
              createDefaultPolicy(agent.agent_id, agent.name),
            );
          }
        } catch (err) {
          console.error('[server] Seed failed:', err);
        }
        _ctx.seeded = true;
      }

      // Auto-register with HOL Registry Broker in the background.
      // This refreshes the cached registration and ensures the agent
      // appears in the HOL index for the W4 demo.
      _ctx.registryBroker.register().then((result) => {
        if (result.success) {
          console.log(`[server] Registry Broker registration confirmed: ${result.uaid || 'cached'}`);
        } else {
          console.warn(`[server] Registry Broker registration failed: ${result.error}`);
        }
      }).catch((err) => {
        console.warn('[server] Registry Broker auto-registration error:', err instanceof Error ? err.message : err);
      });

      return _ctx;
    })();
  }

  return _initPromise;
}

/**
 * Get the context without seeding (for lightweight endpoints like health).
 */
export function getServerContextSync(): ServerContext {
  if (!_ctx) {
    _ctx = createContext();
  }
  return _ctx;
}
