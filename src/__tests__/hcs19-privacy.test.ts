/**
 * Tests for HCS-19 Privacy Module
 *
 * Tests the PrivacyService facade, ConsentManager operations,
 * privacy policies, and audit trail functionality.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { PrivacyService, createDefaultPolicy } from '@/lib/hcs19';
import { ConsentManager } from '@/lib/hcs/hcs19-consent';
import { ProcessingBasis, ConsentStatus } from '@/lib/hcs/hcs19-types';

const TEST_CONFIG = {
  accountId: '0.0.12345',
  privateKey: '302e020100300506032b6570042204200000000000000000000000000000000000000000000000000000000000000001',
  network: 'testnet' as const,
};

describe('PrivacyService', () => {
  let service: PrivacyService;

  beforeEach(() => {
    service = new PrivacyService(TEST_CONFIG);
  });

  describe('grantConsent', () => {
    it('grants consent with all required fields', async () => {
      const result = await service.grantConsent({
        user_id: 'user-001',
        purposes: ['analytics', 'billing'],
        data_types: ['task_data'],
        jurisdiction: 'US',
        legal_basis: ProcessingBasis.Consent,
        consent_method: 'api_request',
        retention_period: '6_months',
        withdrawal_method: 'api_revoke',
        notice_reference: '/api/privacy/policy?agentId=test',
      });

      expect(result.consent).toBeDefined();
      expect(result.consent.consent_id).toMatch(/^consent_/);
      expect(result.consent.user_id).toBe('user-001');
      expect(result.consent.purposes).toEqual(['analytics', 'billing']);
      expect(result.consent.status).toBe(ConsentStatus.Active);
      expect(result.receipt).toBeDefined();
      expect(result.receipt.receipt_id).toMatch(/^rcpt_/);
    });

    it('rejects consent with empty purposes', async () => {
      await expect(
        service.grantConsent({
          user_id: 'user-001',
          purposes: [],
          data_types: ['task_data'],
          jurisdiction: 'US',
          legal_basis: ProcessingBasis.Consent,
          consent_method: 'api_request',
          retention_period: '6_months',
          withdrawal_method: 'api_revoke',
          notice_reference: '/test',
        }),
      ).rejects.toThrow('purposes must be a non-empty array');
    });

    it('rejects consent without jurisdiction', async () => {
      await expect(
        service.grantConsent({
          user_id: 'user-001',
          purposes: ['analytics'],
          data_types: ['task_data'],
          jurisdiction: '',
          legal_basis: ProcessingBasis.Consent,
          consent_method: 'api_request',
          retention_period: '6_months',
          withdrawal_method: 'api_revoke',
          notice_reference: '/test',
        }),
      ).rejects.toThrow('jurisdiction is required');
    });

    it('creates audit trail entry on grant', async () => {
      await service.grantConsent({
        user_id: 'user-audit',
        purposes: ['data_sharing'],
        data_types: ['task_data'],
        jurisdiction: 'EU',
        legal_basis: ProcessingBasis.Consent,
        consent_method: 'checkbox',
        retention_period: '1_year',
        withdrawal_method: 'email',
        notice_reference: '/test',
      });

      const auditLog = service.getAuditLog({ userId: 'user-audit' });
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].action).toBe('granted');
      expect(auditLog[0].user_id).toBe('user-audit');
    });
  });

  describe('revokeConsent', () => {
    it('revokes an active consent', async () => {
      const { consent } = await service.grantConsent({
        user_id: 'user-002',
        purposes: ['analytics'],
        data_types: ['task_data'],
        jurisdiction: 'US',
        legal_basis: ProcessingBasis.Consent,
        consent_method: 'api_request',
        retention_period: '6_months',
        withdrawal_method: 'api_revoke',
        notice_reference: '/test',
      });

      const result = await service.revokeConsent(consent.consent_id, 'No longer needed');
      expect(result.consent.status).toBe(ConsentStatus.Withdrawn);
      expect(result.consent.revocation_reason).toBe('No longer needed');
    });

    it('adds audit entry on revoke', async () => {
      const { consent } = await service.grantConsent({
        user_id: 'user-003',
        purposes: ['billing'],
        data_types: ['account_info'],
        jurisdiction: 'US',
        legal_basis: ProcessingBasis.Contract,
        consent_method: 'api_request',
        retention_period: '3_months',
        withdrawal_method: 'api_revoke',
        notice_reference: '/test',
      });

      await service.revokeConsent(consent.consent_id, 'Privacy concern');
      const auditLog = service.getAuditLog({ userId: 'user-003' });
      expect(auditLog.length).toBe(2); // grant + revoke
      const actions = auditLog.map(e => e.action);
      expect(actions).toContain('granted');
      expect(actions).toContain('revoked');
      const revokeEntry = auditLog.find(e => e.action === 'revoked')!;
      expect(revokeEntry.details).toContain('Privacy concern');
    });

    it('fails to revoke non-existent consent', async () => {
      await expect(
        service.revokeConsent('consent_nonexistent', 'test'),
      ).rejects.toThrow('Consent record not found');
    });
  });

  describe('checkConsent', () => {
    it('returns true for active consent with matching purpose', async () => {
      await service.grantConsent({
        user_id: 'user-check',
        purposes: ['analytics', 'billing'],
        data_types: ['task_data'],
        jurisdiction: 'US',
        legal_basis: ProcessingBasis.Consent,
        consent_method: 'api_request',
        retention_period: '6_months',
        withdrawal_method: 'api_revoke',
        notice_reference: '/test',
      });

      const result = await service.checkConsent('user-check', 'analytics');
      expect(result.consented).toBe(true);
      expect(result.consent).toBeDefined();
    });

    it('returns false for non-matching purpose', async () => {
      await service.grantConsent({
        user_id: 'user-check2',
        purposes: ['billing'],
        data_types: ['task_data'],
        jurisdiction: 'US',
        legal_basis: ProcessingBasis.Consent,
        consent_method: 'api_request',
        retention_period: '6_months',
        withdrawal_method: 'api_revoke',
        notice_reference: '/test',
      });

      const result = await service.checkConsent('user-check2', 'marketing');
      expect(result.consented).toBe(false);
    });

    it('returns false for revoked consent', async () => {
      const { consent } = await service.grantConsent({
        user_id: 'user-revoked',
        purposes: ['analytics'],
        data_types: ['task_data'],
        jurisdiction: 'US',
        legal_basis: ProcessingBasis.Consent,
        consent_method: 'api_request',
        retention_period: '6_months',
        withdrawal_method: 'api_revoke',
        notice_reference: '/test',
      });

      await service.revokeConsent(consent.consent_id, 'test');
      const result = await service.checkConsent('user-revoked', 'analytics');
      expect(result.consented).toBe(false);
    });
  });

  describe('listConsents', () => {
    it('lists all consents for a user', async () => {
      await service.grantConsent({
        user_id: 'user-list',
        purposes: ['analytics'],
        data_types: ['task_data'],
        jurisdiction: 'US',
        legal_basis: ProcessingBasis.Consent,
        consent_method: 'api_request',
        retention_period: '6_months',
        withdrawal_method: 'api_revoke',
        notice_reference: '/test',
      });
      await service.grantConsent({
        user_id: 'user-list',
        purposes: ['billing'],
        data_types: ['account_info'],
        jurisdiction: 'EU',
        legal_basis: ProcessingBasis.Contract,
        consent_method: 'checkbox',
        retention_period: '1_year',
        withdrawal_method: 'email',
        notice_reference: '/test',
      });

      const consents = await service.listConsents('user-list');
      expect(consents.length).toBe(2);
    });

    it('returns empty for unknown user', async () => {
      const consents = await service.listConsents('unknown-user');
      expect(consents.length).toBe(0);
    });
  });

  describe('Privacy Policies', () => {
    it('registers and retrieves a policy', () => {
      const policy = createDefaultPolicy('agent-001', 'TestBot');
      service.registerPolicy(policy);

      const retrieved = service.getPolicy('agent-001');
      expect(retrieved).not.toBeNull();
      expect(retrieved!.agent_name).toBe('TestBot');
      expect(retrieved!.data_collected.length).toBeGreaterThan(0);
      expect(retrieved!.user_rights.length).toBeGreaterThan(0);
    });

    it('returns null for unknown agent', () => {
      const policy = service.getPolicy('nonexistent-agent');
      expect(policy).toBeNull();
    });

    it('lists all policies', () => {
      service.registerPolicy(createDefaultPolicy('agent-a', 'AgentA'));
      service.registerPolicy(createDefaultPolicy('agent-b', 'AgentB'));

      const all = service.getAllPolicies();
      expect(all.length).toBe(2);
    });
  });

  describe('Audit Trail', () => {
    it('filters audit log by agentId', async () => {
      // This grants consent with the config accountId as agent_id
      await service.grantConsent({
        user_id: 'user-filter',
        purposes: ['analytics'],
        data_types: ['task_data'],
        jurisdiction: 'US',
        legal_basis: ProcessingBasis.Consent,
        consent_method: 'api',
        retention_period: '1_month',
        withdrawal_method: 'api',
        notice_reference: '/test',
      });

      const filtered = service.getAuditLog({ agentId: TEST_CONFIG.accountId });
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(e => e.agent_id === TEST_CONFIG.accountId)).toBe(true);
    });

    it('respects limit parameter', async () => {
      // Grant multiple consents
      for (let i = 0; i < 5; i++) {
        await service.grantConsent({
          user_id: `user-limit-${i}`,
          purposes: ['test'],
          data_types: ['data'],
          jurisdiction: 'US',
          legal_basis: ProcessingBasis.Consent,
          consent_method: 'api',
          retention_period: '1_month',
          withdrawal_method: 'api',
          notice_reference: '/test',
        });
      }

      const limited = service.getAuditLog({ limit: 3 });
      expect(limited.length).toBe(3);
    });
  });

  describe('createDefaultPolicy', () => {
    it('creates a valid default policy', () => {
      const policy = createDefaultPolicy('agent-default', 'DefaultAgent');
      expect(policy.agent_id).toBe('agent-default');
      expect(policy.agent_name).toBe('DefaultAgent');
      expect(policy.version).toBe('1.0.0');
      expect(policy.data_collected.length).toBe(3);
      expect(policy.purposes).toContain('service_delivery');
      expect(policy.sharing_policy.shares_with_third_parties).toBe(false);
      expect(policy.user_rights.length).toBe(6);
      expect(policy.jurisdiction).toBe('US');
    });
  });
});

describe('ConsentManager (direct)', () => {
  let manager: ConsentManager;

  beforeEach(() => {
    manager = new ConsentManager(TEST_CONFIG);
  });

  it('calculates expiry from retention period', async () => {
    const { consent } = await manager.grantConsent({
      user_id: 'user-expiry',
      purposes: ['test'],
      data_types: ['data'],
      jurisdiction: 'US',
      legal_basis: ProcessingBasis.Consent,
      consent_method: 'api',
      retention_period: '30_days',
      withdrawal_method: 'api',
      notice_reference: '/test',
    });

    expect(consent.expiry_date).toBeDefined();
    const expiry = new Date(consent.expiry_date!);
    const now = new Date();
    const diffDays = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(29);
    expect(diffDays).toBeLessThanOrEqual(31);
  });

  it('updates consent purposes', async () => {
    const { consent } = await manager.grantConsent({
      user_id: 'user-update',
      purposes: ['analytics'],
      data_types: ['data'],
      jurisdiction: 'US',
      legal_basis: ProcessingBasis.Consent,
      consent_method: 'api',
      retention_period: '1_month',
      withdrawal_method: 'api',
      notice_reference: '/test',
    });

    const updated = await manager.updateConsent(consent.consent_id, {
      purposes: ['analytics', 'billing', 'marketing'],
    } as any);

    expect(updated.consent.purposes).toEqual(['analytics', 'billing', 'marketing']);
  });

  it('tracks HCS messages in message log', async () => {
    await manager.grantConsent({
      user_id: 'user-log',
      purposes: ['test'],
      data_types: ['data'],
      jurisdiction: 'EU',
      legal_basis: ProcessingBasis.Consent,
      consent_method: 'checkbox',
      retention_period: '3_months',
      withdrawal_method: 'email',
      notice_reference: '/test',
    });

    const log = manager.getMessageLog();
    expect(log.length).toBe(1);
    const parsed = JSON.parse(log[0]);
    expect(parsed.p).toBe('hcs-19');
    expect(parsed.op).toBe('consent_granted');
  });
});
