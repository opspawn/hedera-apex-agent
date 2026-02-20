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

  it('getStatus returns registration state', async () => {
    const { RegistryBroker } = await import('@/lib/hol/registry-broker');
    const broker = new RegistryBroker({
      accountId: '0.0.7854018',
      privateKey: 'test-key',
      network: 'testnet',
    });

    // Before registration
    const before = broker.getStatus();
    expect(before.registered).toBe(false);

    // After registration
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
});

describe('AGENT_UAID config', () => {
  it('exports UAID and agent ID constants', async () => {
    const { AGENT_UAID, AGENT_ID } = await import('@/lib/config');
    expect(AGENT_UAID).toMatch(/^uaid:aid:/);
    expect(AGENT_ID).toBe('opspawn-marketplace');
  });
});
