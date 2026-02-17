/**
 * Tests for /api/credits (GET and POST)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockRequestJson, mockPurchaseCreditsWithHbar } = vi.hoisted(() => ({
  mockRequestJson: vi.fn(),
  mockPurchaseCreditsWithHbar: vi.fn(),
}));

vi.mock('@/lib/hol/rb-client', () => ({
  getClient: vi.fn().mockResolvedValue({
    requestJson: mockRequestJson,
    purchaseCreditsWithHbar: mockPurchaseCreditsWithHbar,
  }),
}));

import { GET, POST } from '@/app/api/credits/route';
import { NextRequest } from 'next/server';

function makeRequest(url: string, options?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3003'), options);
}

describe('GET /api/credits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns credit balance for default account', async () => {
    mockRequestJson.mockResolvedValue({ credits: 100, tier: 'standard' });

    const req = makeRequest('http://localhost:3003/api/credits');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.source).toBe('registry-broker');
    expect(data.balance).toEqual({ credits: 100, tier: 'standard' });
  });

  it('uses provided accountId param', async () => {
    mockRequestJson.mockResolvedValue({ credits: 50 });

    const req = makeRequest('http://localhost:3003/api/credits?accountId=0.0.99999');
    const res = await GET(req);
    const data = await res.json();

    expect(data.accountId).toBe('0.0.99999');
    expect(mockRequestJson).toHaveBeenCalledWith(
      '/credits/balance?accountId=0.0.99999',
      { method: 'GET' },
    );
  });

  it('returns 500 on fetch error', async () => {
    mockRequestJson.mockRejectedValue(new Error('Network error'));

    const req = makeRequest('http://localhost:3003/api/credits');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to fetch credit balance');
    expect(data.details).toBe('Network error');
  });
});

describe('POST /api/credits', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  it('returns 503 when private key not configured', async () => {
    process.env.HEDERA_PRIVATE_KEY = '';

    const req = makeRequest('http://localhost:3003/api/credits', {
      method: 'POST',
      body: JSON.stringify({ hbarAmount: 1 }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.error).toBe('HEDERA_PRIVATE_KEY not configured');
  });

  it('returns 503 when private key is placeholder', async () => {
    process.env.HEDERA_PRIVATE_KEY = 'your-private-key-here';

    const req = makeRequest('http://localhost:3003/api/credits', {
      method: 'POST',
      body: JSON.stringify({ hbarAmount: 1 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('purchases credits successfully', async () => {
    process.env.HEDERA_PRIVATE_KEY = 'real-private-key';
    process.env.HEDERA_ACCOUNT_ID = '0.0.12345';

    mockPurchaseCreditsWithHbar.mockResolvedValue({
      txHash: '0x123',
      creditsGranted: 10,
    });

    const req = makeRequest('http://localhost:3003/api/credits', {
      method: 'POST',
      body: JSON.stringify({ hbarAmount: 0.75, memo: 'test-purchase' }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.purchase.txHash).toBe('0x123');
    expect(data.hbarAmount).toBe(0.75);
  });

  it('handles purchase error', async () => {
    process.env.HEDERA_PRIVATE_KEY = 'real-private-key';
    process.env.HEDERA_ACCOUNT_ID = '0.0.12345';

    mockPurchaseCreditsWithHbar.mockRejectedValue(new Error('Insufficient balance'));

    const req = makeRequest('http://localhost:3003/api/credits', {
      method: 'POST',
      body: JSON.stringify({ hbarAmount: 1000 }),
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Failed to purchase credits');
    expect(data.details).toBe('Insufficient balance');
  });
});
