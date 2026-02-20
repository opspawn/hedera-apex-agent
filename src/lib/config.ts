import dotenv from 'dotenv';
import path from 'path';
import { MarketplaceConfig } from './types';

// Load .env.local first (higher priority), then .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

/** UAID assigned by HOL Registry Broker (Sprint 33) */
export const AGENT_UAID = 'uaid:aid:7HGBoKn73TFH3jFYBJ3vYpEBEemDE5GNzhtgCQi146QJbPiMFYX3w6Nn94XgkGKMxm';
export const AGENT_ID = 'opspawn-marketplace';

export function loadConfig(): MarketplaceConfig {
  return {
    hedera: {
      accountId: process.env.HEDERA_ACCOUNT_ID || '0.0.7854018',
      privateKey: process.env.HEDERA_PRIVATE_KEY || '',
      network: (process.env.HEDERA_NETWORK as 'testnet' | 'mainnet') || 'testnet',
    },
    topics: {
      registry: process.env.REGISTRY_TOPIC_ID || '0.0.7311321',
      inbound: process.env.INBOUND_TOPIC_ID || '0.0.7854276',
      outbound: process.env.OUTBOUND_TOPIC_ID || '0.0.7854275',
      profile: process.env.PROFILE_TOPIC_ID || '0.0.7854282',
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
      host: process.env.HOST || '0.0.0.0',
    },
  };
}

export const config = loadConfig();
