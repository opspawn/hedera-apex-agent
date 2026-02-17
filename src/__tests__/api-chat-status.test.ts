/**
 * Tests for GET /api/chat/status
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/chat/status/route';

describe('GET /api/chat/status', () => {
  beforeEach(() => {
    delete process.env.HEDERA_ACCOUNT_ID;
    delete process.env.HEDERA_PRIVATE_KEY;
  });

  it('returns chat status with required fields', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.configured).toBe(true);
    expect(data.provider).toBe('marketplace-responder');
    expect(data.agentReady).toBe(true);
    expect(data.marketplaceAware).toBe(true);
    expect(data.modes).toEqual(['local', 'broker']);
    expect(data.error).toBeNull();
  });

  it('reports broker relay unavailable without hedera config', async () => {
    delete process.env.HEDERA_ACCOUNT_ID;
    delete process.env.HEDERA_PRIVATE_KEY;
    const response = await GET();
    const data = await response.json();

    expect(data.hederaConfigured).toBe(false);
    expect(data.brokerRelayAvailable).toBe(false);
  });

  it('reports broker relay available with hedera config', async () => {
    process.env.HEDERA_ACCOUNT_ID = '0.0.12345';
    process.env.HEDERA_PRIVATE_KEY = 'test-key';

    const response = await GET();
    const data = await response.json();

    expect(data.hederaConfigured).toBe(true);
    expect(data.brokerRelayAvailable).toBe(true);

    delete process.env.HEDERA_ACCOUNT_ID;
    delete process.env.HEDERA_PRIVATE_KEY;
  });
});
