/**
 * Tests for testnet connection: HederaTestnetClient + TestnetIntegration
 *
 * Sprint 28: Validates live/mock mode detection, status reporting,
 * topic creation, message submission, and session tracking.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @hashgraph/sdk so we don't make real network calls
vi.mock('@hashgraph/sdk', () => ({
  Client: {
    forTestnet: vi.fn().mockReturnValue({
      setOperator: vi.fn(),
      close: vi.fn(),
    }),
  },
  TopicCreateTransaction: vi.fn().mockImplementation(() => ({
    setTopicMemo: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({
      getReceipt: vi.fn().mockResolvedValue({
        topicId: { toString: () => '0.0.9999001' },
      }),
    }),
  })),
  TopicMessageSubmitTransaction: vi.fn().mockImplementation(() => ({
    setTopicId: vi.fn().mockReturnThis(),
    setMessage: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({
      getReceipt: vi.fn().mockResolvedValue({
        topicSequenceNumber: { toNumber: () => 1 },
      }),
    }),
  })),
  AccountBalanceQuery: vi.fn().mockImplementation(() => ({
    setAccountId: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({
      hbars: { toBigNumber: () => ({ toNumber: () => 48 }) },
    }),
  })),
}));

import { HederaTestnetClient } from '@/lib/hedera/client';
import { TestnetIntegration } from '@/lib/hedera/testnet-integration';

describe('HederaTestnetClient', () => {
  it('enters mock mode when no credentials provided', () => {
    const client = new HederaTestnetClient();
    expect(client.isMockMode()).toBe(true);
    const status = client.getStatus();
    expect(status.mode).toBe('mock');
    expect(status.connected).toBe(false);
    expect(status.accountId).toBe('mock-account');
  });

  it('enters mock mode with empty private key', () => {
    const client = new HederaTestnetClient({
      accountId: '0.0.7854018',
      privateKey: '',
      network: 'testnet',
    });
    expect(client.isMockMode()).toBe(true);
  });

  it('enters live mode with valid credentials', () => {
    const client = new HederaTestnetClient({
      accountId: '0.0.7854018',
      privateKey: '3030020100300706052b8104000a042204206704731763c9018b1de93be53c15f4c23bbdf163cfbae645d8caf80df2873643',
      network: 'testnet',
    });
    expect(client.isMockMode()).toBe(false);
    const status = client.getStatus();
    expect(status.mode).toBe('live');
    expect(status.connected).toBe(true);
    expect(status.network).toBe('testnet');
    expect(status.accountId).toBe('0.0.7854018');
    expect(status.mirrorNode).toBe('testnet.mirrornode.hedera.com');
  });

  it('creates topic in mock mode', async () => {
    const client = new HederaTestnetClient();
    const topic = await client.createTopic('test-memo');
    expect(topic.topicId).toMatch(/^0\.0\.\d+$/);
    expect(topic.memo).toBe('test-memo');
    expect(topic.createdAt).toBeDefined();
  });

  it('submits message in mock mode', async () => {
    const client = new HederaTestnetClient();
    const result = await client.submitMessage('0.0.123', 'hello');
    expect(result.topicId).toBe('0.0.123');
    expect(result.sequenceNumber).toBe(1);
    expect(result.timestamp).toBeDefined();
  });

  it('increments sequence numbers for same topic', async () => {
    const client = new HederaTestnetClient();
    await client.submitMessage('0.0.123', 'msg1');
    const result = await client.submitMessage('0.0.123', 'msg2');
    expect(result.sequenceNumber).toBe(2);
  });

  it('returns empty messages in mock mode', async () => {
    const client = new HederaTestnetClient();
    const msgs = await client.getTopicMessages('0.0.123');
    expect(msgs).toEqual([]);
  });

  it('returns mock balance in mock mode', async () => {
    const client = new HederaTestnetClient();
    const balance = await client.getAccountBalance();
    expect(balance.hbar).toBe(10000);
    expect(balance.tokens).toEqual({});
  });

  it('closes gracefully in mock mode', async () => {
    const client = new HederaTestnetClient();
    await expect(client.close()).resolves.toBeUndefined();
  });
});

describe('TestnetIntegration', () => {
  it('reports mock mode when no credentials', () => {
    const integration = new TestnetIntegration({
      accountId: '',
      privateKey: '',
      network: 'testnet',
    });
    expect(integration.isLive()).toBe(false);
    const status = integration.getStatus();
    expect(status.mode).toBe('mock');
    expect(status.connected).toBe(false);
    expect(status.topicsCreated).toBe(0);
    expect(status.messagesSubmitted).toBe(0);
  });

  it('reports live mode with valid credentials', () => {
    const integration = new TestnetIntegration({
      accountId: '0.0.7854018',
      privateKey: '3030020100300706052b8104000a042204206704731763c9018b1de93be53c15f4c23bbdf163cfbae645d8caf80df2873643',
      network: 'testnet',
    });
    expect(integration.isLive()).toBe(true);
    const status = integration.getStatus();
    expect(status.mode).toBe('live');
    expect(status.connected).toBe(true);
    expect(status.accountId).toBe('0.0.7854018');
  });

  it('tracks topics created in session', async () => {
    const integration = new TestnetIntegration({
      accountId: '',
      privateKey: '',
      network: 'testnet',
    });
    const topic = await integration.createTopic('test-topic');
    expect(topic.topicId).toBeDefined();
    expect(topic.onChain).toBe(false); // mock mode

    const topics = integration.getTopics();
    expect(topics).toHaveLength(1);
    expect(topics[0].memo).toBe('test-topic');

    const status = integration.getStatus();
    expect(status.topicsCreated).toBe(1);
  });

  it('tracks messages submitted in session', async () => {
    const integration = new TestnetIntegration({
      accountId: '',
      privateKey: '',
      network: 'testnet',
    });
    const msg = await integration.submitMessage('0.0.123', 'hello world');
    expect(msg.topicId).toBe('0.0.123');
    expect(msg.onChain).toBe(false);

    const messages = integration.getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('hello world');
  });

  it('serializes objects when submitting messages', async () => {
    const integration = new TestnetIntegration({
      accountId: '',
      privateKey: '',
      network: 'testnet',
    });
    const msg = await integration.submitMessage('0.0.123', { type: 'test', data: 42 });
    expect(msg.content).toBe('{"type":"test","data":42}');
  });

  it('provides session summary', async () => {
    const integration = new TestnetIntegration({
      accountId: '',
      privateKey: '',
      network: 'testnet',
    });
    await integration.createTopic('topic-1');
    await integration.createTopic('topic-2');
    await integration.submitMessage('0.0.1', 'msg1');

    const summary = integration.getSessionSummary();
    expect(summary.mode).toBe('mock');
    expect(summary.topicsCreated).toBe(2);
    expect(summary.messagesSubmitted).toBe(1);
    expect(summary.onChainTopics).toBe(0);
    expect(summary.onChainMessages).toBe(0);
    expect(summary.topics).toHaveLength(2);
    expect(summary.messages).toHaveLength(1);
  });

  it('exposes underlying client', () => {
    const integration = new TestnetIntegration({
      accountId: '',
      privateKey: '',
      network: 'testnet',
    });
    const client = integration.getClient();
    expect(client).toBeInstanceOf(HederaTestnetClient);
  });
});
