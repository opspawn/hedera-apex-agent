/**
 * Tests for the Registry Broker Client singleton (rb-client.ts)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the standards-sdk module with a class constructor
vi.mock('@hashgraphonline/standards-sdk', () => {
  class MockRegistryBrokerClient {
    authenticateWithLedgerCredentials = vi.fn().mockResolvedValue(undefined);
    search = vi.fn();
    vectorSearch = vi.fn();
    requestJson = vi.fn();
    listSkills = vi.fn();
    chat = { createSession: vi.fn(), sendMessage: vi.fn() };
    getAgentFeedback = vi.fn();
    checkAgentFeedbackEligibility = vi.fn();
    submitAgentFeedback = vi.fn();
    purchaseCreditsWithHbar = vi.fn();
    registerAgent = vi.fn();
  }
  return { RegistryBrokerClient: MockRegistryBrokerClient };
});

describe('rb-client', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.HEDERA_PRIVATE_KEY;
    delete process.env.HEDERA_ACCOUNT_ID;
    delete process.env.HEDERA_NETWORK;
  });

  it('should create a RegistryBrokerClient on first call', async () => {
    const mod = await import('@/lib/hol/rb-client');
    const client = await mod.getClient();
    expect(client).toBeDefined();
    expect(client.search).toBeDefined();
  });

  it('should return the same client instance on subsequent calls', async () => {
    const mod = await import('@/lib/hol/rb-client');
    const client1 = await mod.getClient();
    const client2 = await mod.getClient();
    expect(client1).toBe(client2);
  });

  it('should authenticate with ledger credentials when private key is set', async () => {
    process.env.HEDERA_PRIVATE_KEY = 'test-private-key';
    process.env.HEDERA_ACCOUNT_ID = '0.0.12345';
    process.env.HEDERA_NETWORK = 'testnet';

    const mod = await import('@/lib/hol/rb-client');
    const client = await mod.getClient();

    expect(client.authenticateWithLedgerCredentials).toHaveBeenCalledWith({
      accountId: '0.0.12345',
      network: 'hedera:testnet',
      hederaPrivateKey: 'test-private-key',
      expiresInMinutes: 30,
      label: 'OpSpawn Marketplace',
    });
  });

  it('should skip auth when no private key configured', async () => {
    process.env.HEDERA_PRIVATE_KEY = '';

    const mod = await import('@/lib/hol/rb-client');
    const client = await mod.getClient();

    expect(client.authenticateWithLedgerCredentials).not.toHaveBeenCalled();
  });

  it('getUnauthenticatedClient returns client without auth', async () => {
    const mod = await import('@/lib/hol/rb-client');
    const client = mod.getUnauthenticatedClient();
    expect(client).toBeDefined();
    expect(client.authenticateWithLedgerCredentials).not.toHaveBeenCalled();
  });
});
