/**
 * HCS-19 Privacy Module — Unified Privacy Service
 *
 * Provides a single facade over ConsentManager, PrivacyPolicy management,
 * and audit trail for the Hedera Agent Marketplace. This is the primary
 * import for privacy features throughout the app.
 *
 * HCS-19 is the Privacy Compliance Standard for Hedera — the first known
 * implementation of ISO/IEC TS 27560:2023 on a public DLT.
 */

import { v4 as uuidv4 } from 'uuid';
import { ConsentManager } from '../hcs/hcs19-consent';
import { ComplianceAuditor } from '../hcs/hcs19-audit';
import type {
  HCS19Config,
  UserConsentRecord,
  ConsentReceipt,
  GrantConsentRequest,
  ConsentQueryFilters,
  ConsentStatus,
} from '../hcs/hcs19-types';

// ============================================================
// Privacy Policy Interface
// ============================================================

/** Describes an agent's privacy policy — what data it collects and why */
export interface PrivacyPolicy {
  agent_id: string;
  agent_name: string;
  version: string;
  effective_date: string;
  data_collected: DataCollectionItem[];
  purposes: string[];
  retention_period: string;
  sharing_policy: SharingPolicy;
  user_rights: string[];
  contact: string;
  jurisdiction: string;
  last_updated: string;
}

export interface DataCollectionItem {
  category: string;
  description: string;
  required: boolean;
  legal_basis: string;
}

export interface SharingPolicy {
  shares_with_third_parties: boolean;
  third_parties: string[];
  safeguards: string[];
}

/** Consent audit trail entry */
export interface ConsentAuditEntry {
  id: string;
  consent_id: string;
  action: 'granted' | 'revoked' | 'updated' | 'verified' | 'expired';
  agent_id: string;
  user_id: string;
  timestamp: string;
  details: string;
}

// ============================================================
// Privacy Service (Facade)
// ============================================================

/**
 * PrivacyService provides a unified API for all HCS-19 privacy operations.
 * Used by API routes and the privacy dashboard.
 */
export class PrivacyService {
  private consentManager: ConsentManager;
  private auditor: ComplianceAuditor | null;
  private policies: Map<string, PrivacyPolicy> = new Map();
  private auditLog: ConsentAuditEntry[] = [];

  constructor(config: HCS19Config) {
    this.consentManager = new ConsentManager(config);
    try {
      this.auditor = new ComplianceAuditor(config);
    } catch {
      this.auditor = null;
    }
  }

  async init(consentTopicId?: string): Promise<void> {
    await this.consentManager.init(consentTopicId);
  }

  // ----------------------------------------------------------
  // Consent Operations
  // ----------------------------------------------------------

  async grantConsent(request: GrantConsentRequest): Promise<{
    consent: UserConsentRecord;
    receipt: ConsentReceipt;
  }> {
    const result = await this.consentManager.grantConsent(request);
    this.addAuditEntry({
      consent_id: result.consent.consent_id,
      action: 'granted',
      agent_id: result.consent.agent_id,
      user_id: request.user_id,
      details: `Consent granted for purposes: ${request.purposes.join(', ')}`,
    });
    return result;
  }

  async revokeConsent(consentId: string, reason: string): Promise<{
    consent: UserConsentRecord;
    receipt: ConsentReceipt;
  }> {
    const result = await this.consentManager.revokeConsent(consentId, reason);
    this.addAuditEntry({
      consent_id: consentId,
      action: 'revoked',
      agent_id: result.consent.agent_id,
      user_id: result.consent.user_id,
      details: `Consent revoked: ${reason}`,
    });
    return result;
  }

  async withdrawConsent(consentId: string): Promise<{
    consent: UserConsentRecord;
    receipt: ConsentReceipt;
  }> {
    const result = await this.consentManager.withdrawConsent(consentId);
    this.addAuditEntry({
      consent_id: consentId,
      action: 'revoked',
      agent_id: result.consent.agent_id,
      user_id: result.consent.user_id,
      details: 'Consent withdrawn by user',
    });
    return result;
  }

  async checkConsent(userId: string, purpose: string): Promise<{
    consented: boolean;
    consent?: UserConsentRecord;
  }> {
    return this.consentManager.verifyConsent(userId, purpose);
  }

  async getConsent(consentId: string): Promise<UserConsentRecord | null> {
    return this.consentManager.getConsent(consentId);
  }

  async listConsents(userId: string, filters?: ConsentQueryFilters): Promise<UserConsentRecord[]> {
    if (filters) {
      return this.consentManager.queryConsent(userId, filters);
    }
    return this.consentManager.listConsents(userId);
  }

  async listActiveConsents(agentId: string): Promise<UserConsentRecord[]> {
    return this.consentManager.listActiveConsents(agentId);
  }

  // ----------------------------------------------------------
  // Privacy Policy Operations
  // ----------------------------------------------------------

  registerPolicy(policy: PrivacyPolicy): void {
    this.policies.set(policy.agent_id, policy);
  }

  getPolicy(agentId: string): PrivacyPolicy | null {
    return this.policies.get(agentId) ?? null;
  }

  getAllPolicies(): PrivacyPolicy[] {
    return Array.from(this.policies.values());
  }

  // ----------------------------------------------------------
  // Audit Trail
  // ----------------------------------------------------------

  private addAuditEntry(entry: Omit<ConsentAuditEntry, 'id' | 'timestamp'>): void {
    this.auditLog.push({
      ...entry,
      id: `audit_${uuidv4()}`,
      timestamp: new Date().toISOString(),
    });
  }

  getAuditLog(filters?: { agentId?: string; userId?: string; limit?: number }): ConsentAuditEntry[] {
    let entries = [...this.auditLog];
    if (filters?.agentId) {
      entries = entries.filter(e => e.agent_id === filters.agentId);
    }
    if (filters?.userId) {
      entries = entries.filter(e => e.user_id === filters.userId);
    }
    // Most recent first
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (filters?.limit) {
      entries = entries.slice(0, filters.limit);
    }
    return entries;
  }

  // ----------------------------------------------------------
  // Consent Manager access (for advanced use)
  // ----------------------------------------------------------

  getConsentManager(): ConsentManager {
    return this.consentManager;
  }
}

// Re-export key types for convenience
export type {
  HCS19Config,
  UserConsentRecord,
  ConsentReceipt,
  GrantConsentRequest,
  ConsentQueryFilters,
  ConsentStatus,
};
export { ConsentManager } from '../hcs/hcs19-consent';
export { ComplianceAuditor } from '../hcs/hcs19-audit';
export { DataProcessingRegistry } from '../hcs/hcs19-processing';
export { PrivacyRightsHandler } from '../hcs/hcs19-rights';

/** Default privacy policies for demo agents */
export function createDefaultPolicy(agentId: string, agentName: string): PrivacyPolicy {
  return {
    agent_id: agentId,
    agent_name: agentName,
    version: '1.0.0',
    effective_date: new Date().toISOString(),
    data_collected: [
      {
        category: 'Task Data',
        description: 'Input data provided for skill execution',
        required: true,
        legal_basis: 'Contract performance',
      },
      {
        category: 'Usage Analytics',
        description: 'Aggregated usage statistics for service improvement',
        required: false,
        legal_basis: 'Legitimate interest',
      },
      {
        category: 'Account Information',
        description: 'Hedera account ID for payment processing',
        required: true,
        legal_basis: 'Contract performance',
      },
    ],
    purposes: ['service_delivery', 'billing', 'service_improvement'],
    retention_period: '6_months',
    sharing_policy: {
      shares_with_third_parties: false,
      third_parties: [],
      safeguards: ['End-to-end encryption', 'HCS immutable audit trail'],
    },
    user_rights: [
      'Right to access your data',
      'Right to rectification',
      'Right to erasure',
      'Right to data portability',
      'Right to object to processing',
      'Right to withdraw consent',
    ],
    contact: 'privacy@opspawn.com',
    jurisdiction: 'US',
    last_updated: new Date().toISOString(),
  };
}
