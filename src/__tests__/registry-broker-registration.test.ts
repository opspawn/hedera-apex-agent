/**
 * Tests for Registry Broker agent registration (Sprint 33)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@hashgraphonline/standards-sdk', () => {
  class MockRegistryBrokerClient {
    authenticateWithLedgerCredentials = vi.fn().mockResolvedValue(undefined);
    registerAgent = vi.fn().mockResolvedValue({
      success: true,
      status: 'duplicate',
      uaid: 'uaid:aid:test123',
      agentId: 'opspawn-marketplace',
      message: 'Agent already registered',
    });
    search = vi.fn().mockResolvedValue({ hits: [], total: 0 });
    getDefaultHeaders = vi.fn().mockReturnValue({ 'x-api-key': 'test' });
    listSkills = vi.fn().mockResolvedValue({ skills: [] });
    quoteSkillPublish = vi.fn();
    publishSkill = vi.fn();
    waitForRegistrationCompletion = vi.fn();
  }

  return {
    RegistryBrokerClient: MockRegistryBrokerClient,
    isSuccessRegisterAgentResponse: vi.fn((r: any) => r?.success && r?.uaid),
    isPendingRegisterAgentResponse: vi.fn((r: any) => r?.status === 'pending'),
    isPartialRegisterAgentResponse: vi.fn((r: any) => r?.status === 'partial'),
  };
});

describe('RegistryBroker', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.HEDERA_ACCOUNT_ID = '0.0.7854018';
    process.env.HEDERA_PRIVATE_KEY = 'test-key';
    process.env.HEDERA_NETWORK = 'testnet';
  });

  it('builds agent profile with correct fields', async () => {
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');
    const broker = new RegistryBroker({
      accountId: '0.0.7854018',
      privateKey: 'test-key',
      network: 'testnet',
    });

    const profile = broker.buildProfile();
    expect(profile.display_name).toBe('OpSpawn Agent Marketplace');
    expect(profile.alias).toBe('opspawn-marketplace');
    expect(profile.tags).toContain('marketplace');
    expect(profile.tags).toContain('hcs-26');
    expect(profile.capabilities).toContain('agent-discovery');
    expect(profile.model).toBe('claude-opus-4-6');
    expect(profile.creator).toBe('OpSpawn');
  });

  it('registers agent with hashgraph-online registry and https protocol', async () => {
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');
    const broker = new RegistryBroker({
      accountId: '0.0.7854018',
      privateKey: 'test-key',
      network: 'testnet',
    });

    const result = await broker.register();
    expect(result.success).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  it('register uses protocol https instead of hcs-10', async () => {
    const { RegistryBrokerClient } = await import('@hashgraphonline/standards-sdk');
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');

    const broker = new RegistryBroker({
      accountId: '0.0.7854018',
      privateKey: 'test-key',
      network: 'testnet',
    });

    await broker.register();

    const { getClient } = await import('@/lib/hol/rb-client');
    const client = await getClient();

    expect(client.registerAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        protocol: 'https',
        registry: 'hashgraph-online',
        endpoint: expect.stringContaining('hedera.opspawn.com'),
        metadata: expect.objectContaining({
          nativeId: 'hedera.opspawn.com',
          customFields: expect.objectContaining({
            nativeId: 'hedera:testnet:0.0.7854018',
            accountId: '0.0.7854018',
          }),
        }),
      }),
    );
  });

  it('getStatus returns registered=true from seeded UAID on cold start', async () => {
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');
    const broker = new RegistryBroker({
      accountId: '0.0.7854018',
      privateKey: 'test-key',
      network: 'testnet',
    });

    // Should be registered from seeded UAID (Sprint 33 cached registration)
    const status = broker.getStatus();
    expect(status.registered).toBe(true);
    expect(status.uaid).toMatch(/^uaid:aid:/);
    expect(status.brokerUrl).toContain('hol.org');
  });

  it('getStatus updates after fresh registration', async () => {
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');
    const broker = new RegistryBroker({
      accountId: '0.0.7854018',
      privateKey: 'test-key',
      network: 'testnet',
    });

    await broker.register();
    const after = broker.getStatus();
    expect(after.registered).toBe(true);
    expect(after.brokerUrl).toContain('hol.org');
  });

  it('verifyRegistration searches the broker index', async () => {
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');
    const broker = new RegistryBroker({
      accountId: '0.0.7854018',
      privateKey: 'test-key',
      network: 'testnet',
    });

    const verified = await broker.verifyRegistration();
    expect(typeof verified).toBe('boolean');
  });

  it('fromConfig creates instance from env config', async () => {
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');
    const broker = RegistryBroker.fromConfig();
    expect(broker).toBeDefined();
    expect(broker.getBrokerUrl()).toContain('hol.org');
  });

  it('falls back to direct HTTP when SDK throws parse error', async () => {
    // Override registerAgent to throw a parse error
    const { RegistryBrokerClient } = await import('@hashgraphonline/standards-sdk');
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');
    const { getClient } = await import('@/lib/hol/rb-client');

    const client = await getClient();
    (client.registerAgent as any).mockRejectedValueOnce(
      new Error('Failed to parse register agent response'),
    );

    // Mock global fetch for the direct HTTP fallback
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        status: 'duplicate',
        uaid: 'uaid:aid:httpFallback123',
        agentId: 'opspawn-marketplace',
        message: 'Agent already registered',
      }),
    }) as any;

    const broker = new RegistryBroker({
      accountId: '0.0.7854018',
      privateKey: 'test-key',
      network: 'testnet',
    });

    const result = await broker.register();
    expect(result.success).toBe(true);
    expect(result.uaid).toBe('uaid:aid:httpFallback123');

    globalThis.fetch = originalFetch;
  });

  it('does not fallback on non-parse SDK errors', async () => {
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');
    const { getClient } = await import('@/lib/hol/rb-client');

    const client = await getClient();
    (client.registerAgent as any).mockRejectedValueOnce(
      new Error('Authentication failed'),
    );

    const broker = new RegistryBroker({
      accountId: '0.0.7854018',
      privateKey: 'test-key',
      network: 'testnet',
    });

    const result = await broker.register();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Authentication failed');
  });
});

describe('AGENT_UAID config', () => {
  it('exports UAID and agent ID constants', async () => {
    const { AGENT_UAID, AGENT_ID } = await import('@/lib/config');
    expect(AGENT_UAID).toMatch(/^uaid:aid:/);
    expect(AGENT_ID).toBe('opspawn-marketplace');
  });
});
