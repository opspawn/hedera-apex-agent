'use client'

import { useState, useEffect, useCallback } from 'react'

interface ConsentRecord {
  consent_id: string
  user_id: string
  agent_id: string
  purposes: string[]
  data_types: string[]
  jurisdiction: string
  status: string
  consent_timestamp: string
  retention_period: string
  expiry_date?: string
}

interface AuditEntry {
  id: string
  consent_id: string
  action: string
  agent_id: string
  user_id: string
  timestamp: string
  details: string
}

interface PrivacyPolicy {
  agent_id: string
  agent_name: string
  version: string
  data_collected: Array<{
    category: string
    description: string
    required: boolean
    legal_basis: string
  }>
  purposes: string[]
  retention_period: string
  sharing_policy: {
    shares_with_third_parties: boolean
    third_parties: string[]
    safeguards: string[]
  }
  user_rights: string[]
  jurisdiction: string
}

type TabId = 'consents' | 'policies' | 'audit' | 'grant'

export default function PrivacyPage() {
  const [activeTab, setActiveTab] = useState<TabId>('consents')
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [policies, setPolicies] = useState<PrivacyPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [grantForm, setGrantForm] = useState({
    user_id: '',
    agent_id: '',
    purposes: '',
    jurisdiction: 'US',
  })
  const [grantResult, setGrantResult] = useState<string | null>(null)

  const loadConsents = useCallback(async () => {
    try {
      // Load consents for a demo user
      const res = await fetch('/api/privacy/consent?userId=demo-user')
      if (res.ok) {
        const data = await res.json()
        setConsents(data.consents || [])
      }
    } catch { /* ignore */ }
  }, [])

  const loadAudit = useCallback(async () => {
    try {
      const res = await fetch('/api/privacy/audit?limit=50')
      if (res.ok) {
        const data = await res.json()
        setAuditEntries(data.entries || [])
      }
    } catch { /* ignore */ }
  }, [])

  const loadPolicies = useCallback(async () => {
    try {
      const res = await fetch('/api/privacy/policy')
      if (res.ok) {
        const data = await res.json()
        setPolicies(data.policies || [])
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadConsents(), loadAudit(), loadPolicies()]).finally(() => setLoading(false))
  }, [loadConsents, loadAudit, loadPolicies])

  const handleRevoke = async (consentId: string) => {
    setRevoking(consentId)
    try {
      const res = await fetch('/api/privacy/consent', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId, reason: 'User revoked via dashboard' }),
      })
      if (res.ok) {
        await loadConsents()
        await loadAudit()
      }
    } catch { /* ignore */ }
    setRevoking(null)
  }

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    setGrantResult(null)
    try {
      const res = await fetch('/api/privacy/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: grantForm.user_id,
          agent_id: grantForm.agent_id,
          purposes: grantForm.purposes.split(',').map(p => p.trim()).filter(Boolean),
          jurisdiction: grantForm.jurisdiction,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setGrantResult(`Consent granted: ${data.consent?.consent_id || 'success'}`)
        setGrantForm({ user_id: '', agent_id: '', purposes: '', jurisdiction: 'US' })
        await loadConsents()
        await loadAudit()
      } else {
        setGrantResult(`Error: ${data.error}`)
      }
    } catch (err: any) {
      setGrantResult(`Error: ${err.message}`)
    }
  }

  const tabs: Array<{ id: TabId; label: string; icon: string }> = [
    { id: 'consents', label: 'Active Consents', icon: '🔐' },
    { id: 'policies', label: 'Privacy Policies', icon: '📋' },
    { id: 'audit', label: 'Audit Trail', icon: '📜' },
    { id: 'grant', label: 'Grant Consent', icon: '✅' },
  ]

  return (
    <main className="min-h-screen bg-hedera-dark text-white page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hedera-green to-emerald-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                <span className="text-hedera-green">Privacy</span> Dashboard
              </h1>
              <p className="text-gray-400 text-sm">
                HCS-19 Privacy Compliance Standard — ISO/IEC TS 27560:2023
              </p>
            </div>
          </div>

          {/* Standard badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {['HCS-19', 'GDPR', 'CCPA', 'ISO 27560'].map(badge => (
              <span key={badge} className="text-xs px-2.5 py-1 rounded-full bg-hedera-green/10 border border-hedera-green/20 text-hedera-green">
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-hedera-card rounded-xl p-1 border border-hedera-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-hedera-green/10 text-hedera-green border border-hedera-green/20'
                  : 'text-gray-400 hover:text-white hover:bg-hedera-dark/50'
              }`}
            >
              <span className="hidden sm:inline mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-hedera-green border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Active Consents Tab */}
        {!loading && activeTab === 'consents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">
                Active Consent Records
              </h2>
              <span className="text-xs text-gray-500">{consents.length} records</span>
            </div>

            {consents.length === 0 ? (
              <div className="bg-hedera-card border border-hedera-border rounded-xl p-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-hedera-dark flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">No active consent records</p>
                <p className="text-gray-500 text-xs mt-1">Grant consent using the &quot;Grant Consent&quot; tab</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {consents.map(consent => (
                  <div
                    key={consent.consent_id}
                    className="bg-hedera-card border border-hedera-border rounded-xl p-5 hover:border-hedera-green/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${
                            consent.status === 'active' ? 'bg-hedera-green' : 'bg-red-400'
                          }`} />
                          <span className="font-medium text-sm">{consent.consent_id.slice(0, 20)}...</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          Agent: {consent.agent_id} &middot; User: {consent.user_id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          consent.status === 'active'
                            ? 'bg-hedera-green/10 text-hedera-green border border-hedera-green/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {consent.status}
                        </span>
                        {consent.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(consent.consent_id)}
                            disabled={revoking === consent.consent_id}
                            className="text-xs px-3 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {revoking === consent.consent_id ? 'Revoking...' : 'Revoke'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500 block mb-0.5">Purposes</span>
                        <div className="flex flex-wrap gap-1">
                          {consent.purposes.map(p => (
                            <span key={p} className="px-1.5 py-0.5 rounded bg-hedera-purple/10 border border-hedera-purple/20 text-hedera-purple">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Jurisdiction</span>
                        <span className="text-white">{consent.jurisdiction}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Retention</span>
                        <span className="text-white">{consent.retention_period}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Granted</span>
                        <span className="text-white">
                          {new Date(consent.consent_timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Privacy Policies Tab */}
        {!loading && activeTab === 'policies' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">Agent Privacy Policies</h2>
              <span className="text-xs text-gray-500">{policies.length} policies</span>
            </div>

            {policies.length === 0 ? (
              <div className="bg-hedera-card border border-hedera-border rounded-xl p-8 text-center">
                <p className="text-gray-400 text-sm">No privacy policies registered</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {policies.map(policy => (
                  <div
                    key={policy.agent_id}
                    className="bg-hedera-card border border-hedera-border rounded-xl p-5"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-white">{policy.agent_name}</h3>
                        <span className="text-xs text-gray-500">
                          Version {policy.version} &middot; {policy.jurisdiction}
                        </span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-hedera-green/10 border border-hedera-green/20 text-hedera-green">
                        HCS-19 Compliant
                      </span>
                    </div>

                    {/* Data collected */}
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                        Data Collected
                      </h4>
                      <div className="space-y-1.5">
                        {policy.data_collected.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs bg-hedera-dark/50 rounded-lg px-3 py-2">
                            <div>
                              <span className="text-white font-medium">{item.category}</span>
                              <span className="text-gray-500 ml-2">{item.description}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className={`px-1.5 py-0.5 rounded ${
                                item.required
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-gray-500/10 text-gray-400'
                              }`}>
                                {item.required ? 'Required' : 'Optional'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sharing & Rights */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                          Data Sharing
                        </h4>
                        <div className="bg-hedera-dark/50 rounded-lg px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${
                              policy.sharing_policy.shares_with_third_parties ? 'bg-amber-400' : 'bg-hedera-green'
                            }`} />
                            <span className="text-white">
                              {policy.sharing_policy.shares_with_third_parties
                                ? 'Shares with third parties'
                                : 'No third-party sharing'}
                            </span>
                          </div>
                          {policy.sharing_policy.safeguards.map((s, i) => (
                            <span key={i} className="text-gray-500 block">• {s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                          Your Rights
                        </h4>
                        <div className="bg-hedera-dark/50 rounded-lg px-3 py-2 text-xs space-y-0.5">
                          {policy.user_rights.map((right, i) => (
                            <span key={i} className="text-gray-400 block">• {right}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      Retention: {policy.retention_period} &middot; Contact: {(policy as any).contact}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Trail Tab */}
        {!loading && activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">Consent Audit Trail</h2>
              <span className="text-xs text-gray-500">{auditEntries.length} entries</span>
            </div>

            {auditEntries.length === 0 ? (
              <div className="bg-hedera-card border border-hedera-border rounded-xl p-8 text-center">
                <p className="text-gray-400 text-sm">No audit entries yet</p>
                <p className="text-gray-500 text-xs mt-1">Consent operations are recorded immutably on HCS</p>
              </div>
            ) : (
              <div className="bg-hedera-card border border-hedera-border rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-hedera-border">
                      <th className="text-left p-3 text-gray-400 font-medium">Timestamp</th>
                      <th className="text-left p-3 text-gray-400 font-medium">Action</th>
                      <th className="text-left p-3 text-gray-400 font-medium hidden sm:table-cell">Agent</th>
                      <th className="text-left p-3 text-gray-400 font-medium hidden md:table-cell">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.map(entry => (
                      <tr key={entry.id} className="border-b border-hedera-border/50 hover:bg-hedera-dark/30">
                        <td className="p-3 text-gray-300">
                          {new Date(entry.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full ${
                            entry.action === 'granted'
                              ? 'bg-hedera-green/10 text-hedera-green'
                              : entry.action === 'revoked'
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {entry.action}
                          </span>
                        </td>
                        <td className="p-3 text-gray-400 hidden sm:table-cell font-mono">
                          {entry.agent_id.slice(0, 16)}...
                        </td>
                        <td className="p-3 text-gray-500 hidden md:table-cell">
                          {entry.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Grant Consent Tab */}
        {!loading && activeTab === 'grant' && (
          <div className="max-w-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Grant New Consent</h2>

            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">User ID</label>
                <input
                  type="text"
                  value={grantForm.user_id}
                  onChange={e => setGrantForm(f => ({ ...f, user_id: e.target.value }))}
                  placeholder="e.g., demo-user"
                  required
                  className="w-full bg-hedera-card border border-hedera-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-hedera-green/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Agent ID</label>
                <input
                  type="text"
                  value={grantForm.agent_id}
                  onChange={e => setGrantForm(f => ({ ...f, agent_id: e.target.value }))}
                  placeholder="e.g., agent-001"
                  required
                  className="w-full bg-hedera-card border border-hedera-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-hedera-green/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Purposes (comma-separated)
                </label>
                <input
                  type="text"
                  value={grantForm.purposes}
                  onChange={e => setGrantForm(f => ({ ...f, purposes: e.target.value }))}
                  placeholder="e.g., analytics, data_sharing, billing"
                  required
                  className="w-full bg-hedera-card border border-hedera-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-hedera-green/50"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Jurisdiction</label>
                <select
                  value={grantForm.jurisdiction}
                  onChange={e => setGrantForm(f => ({ ...f, jurisdiction: e.target.value }))}
                  className="w-full bg-hedera-card border border-hedera-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-hedera-green/50"
                >
                  <option value="US">US (United States)</option>
                  <option value="EU">EU (European Union / GDPR)</option>
                  <option value="US-CA">US-CA (California / CCPA)</option>
                  <option value="IN">IN (India / DDP)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-hedera-green to-emerald-600 text-white font-medium text-sm hover:from-hedera-green/90 hover:to-emerald-600/90 transition-all"
              >
                Grant Consent
              </button>

              {grantResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  grantResult.startsWith('Error')
                    ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                    : 'bg-hedera-green/10 border border-hedera-green/20 text-hedera-green'
                }`}>
                  {grantResult}
                </div>
              )}
            </form>
          </div>
        )}

        {/* HCS-19 Info Footer */}
        <div className="mt-12 bg-hedera-card border border-hedera-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-3">About HCS-19 Privacy Standard</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400">
            <div>
              <h4 className="text-hedera-green font-medium mb-1">Consent Management</h4>
              <p>Grant, revoke, and verify data sharing consent between agents with full audit trail on Hedera Consensus Service.</p>
            </div>
            <div>
              <h4 className="text-hedera-green font-medium mb-1">Regulatory Compliance</h4>
              <p>Aligned with ISO/IEC TS 27560:2023, GDPR, CCPA, and DDP frameworks with 13 required consent fields.</p>
            </div>
            <div>
              <h4 className="text-hedera-green font-medium mb-1">Immutable Audit Trail</h4>
              <p>All consent operations are recorded on HCS topics, providing tamper-proof evidence of data handling practices.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
