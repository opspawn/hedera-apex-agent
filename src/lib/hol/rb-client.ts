/**
 * Registry Broker Client Singleton
 *
 * Provides a lazily-initialized, auto-authenticating RegistryBrokerClient
 * from @hashgraphonline/standards-sdk. All API routes that need real HOL
 * Registry Broker calls should use getClient() from this module.
 */

import { RegistryBrokerClient } from '@hashgraphonline/standards-sdk';

const BROKER_BASE_URL = 'https://hol.org/registry/api/v1';
const AUTH_EXPIRY_MINUTES = 30;

let _client: RegistryBrokerClient | null = null;
let _authPromise: Promise<void> | null = null;
let _lastAuth = 0;

/**
 * Get a lazily-initialized and authenticated RegistryBrokerClient.
 * Re-authenticates automatically when the token is near expiry.
 */
export async function getClient(): Promise<RegistryBrokerClient> {
  if (!_client) {
    _client = new RegistryBrokerClient({
      baseUrl: BROKER_BASE_URL,
    });
  }

  const now = Date.now();
  const expiryMs = (AUTH_EXPIRY_MINUTES - 2) * 60 * 1000; // re-auth 2 min before expiry

  if (now - _lastAuth > expiryMs) {
    if (!_authPromise) {
      _authPromise = authenticateClient(_client).finally(() => {
        _authPromise = null;
      });
    }
    await _authPromise;
  }

  return _client;
}

async function authenticateClient(client: RegistryBrokerClient): Promise<void> {
  const accountId = process.env.HEDERA_ACCOUNT_ID || '0.0.7854018';
  const privateKey = process.env.HEDERA_PRIVATE_KEY || '';
  const network = process.env.HEDERA_NETWORK || 'testnet';

  if (!privateKey || privateKey === 'your-private-key-here') {
    console.warn('[rb-client] No HEDERA_PRIVATE_KEY configured — client will only work for free endpoints');
    _lastAuth = Date.now();
    return;
  }

  try {
    await client.authenticateWithLedgerCredentials({
      accountId,
      network: `hedera:${network}`,
      hederaPrivateKey: privateKey,
      expiresInMinutes: AUTH_EXPIRY_MINUTES,
      label: 'OpSpawn Marketplace',
    });
    _lastAuth = Date.now();
    console.log('[rb-client] Authenticated with HOL Registry Broker');
  } catch (err) {
    console.error('[rb-client] Auth failed:', err instanceof Error ? err.message : err);
    // Still mark as attempted to avoid retry storm
    _lastAuth = Date.now();
  }
}

/**
 * Get client without authentication (for free endpoints like search).
 */
export function getUnauthenticatedClient(): RegistryBrokerClient {
  if (!_client) {
    _client = new RegistryBrokerClient({
      baseUrl: BROKER_BASE_URL,
    });
  }
  return _client;
}
