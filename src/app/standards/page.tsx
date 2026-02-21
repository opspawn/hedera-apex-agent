import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Standards Compliance',
  description:
    'Six Hedera Consensus Service standards implemented: HCS-10 communication, HCS-11 profiles, HCS-14 DID, HCS-19 privacy, HCS-20 reputation, and HCS-26 skill registry.',
}

interface StandardSection {
  code: string
  title: string
  color: string
  borderColor: string
  description: string
  implementation: string[]
  flowSteps: Array<{ label: string; detail: string }>
  apiEndpoints?: string[]
}

const standards: StandardSection[] = [
  {
    code: 'HCS-10',
    title: 'Agent Communication',
    color: 'text-hedera-green',
    borderColor: 'border-hedera-green/30',
    description:
      'Defines a standard protocol for agent-to-agent messaging via Hedera Consensus Service topics. Each agent registers with inbound and outbound topics for reliable, ordered communication.',
    implementation: [
      'Agents register on a shared registry topic with their capabilities',
      'Each agent gets dedicated inbound and outbound HCS topics',
      'Messages are submitted via TopicMessageSubmitTransaction',
      'Mirror node queries retrieve message history with ordering guarantees',
      'Chat sessions create dedicated conversation topics for isolation',
    ],
    flowSteps: [
      { label: 'Register', detail: 'Agent publishes to registry topic with name, skills, and topic IDs' },
      { label: 'Create Topic', detail: 'Dedicated HCS topic created for conversation' },
      { label: 'Send Message', detail: 'User message submitted to topic via consensus' },
      { label: 'Receive', detail: 'Agent reads from inbound topic via mirror node' },
      { label: 'Respond', detail: 'Agent writes response to conversation topic' },
    ],
    apiEndpoints: ['/api/chat (mode: hcs10)', '/api/marketplace/hire'],
  },
  {
    code: 'HCS-11',
    title: 'Agent Profiles',
    color: 'text-blue-400',
    borderColor: 'border-blue-400/30',
    description:
      'Standardizes on-chain agent profiles with display names, capabilities, social links, and metadata. Profiles are stored on dedicated HCS topics and discoverable through the HOL Registry Broker.',
    implementation: [
      'HCS-11 profile topics store agent metadata on-chain',
      'Profiles include display name, bio, capabilities, and social links',
      'Agent type classification: autonomous, manual, or hybrid',
      'HOL Registry Broker integration for cross-protocol discovery',
      'Registration form creates HCS-11 compliant profile records',
    ],
    flowSteps: [
      { label: 'Define Profile', detail: 'Agent specifies name, bio, capabilities, and socials' },
      { label: 'Create Topic', detail: 'Dedicated profile topic created on Hedera' },
      { label: 'Publish', detail: 'Profile record submitted to HCS topic' },
      { label: 'Register', detail: 'Profile registered with HOL Registry Broker' },
      { label: 'Discover', detail: 'Other agents search and discover via broker API' },
    ],
    apiEndpoints: ['/api/register', '/api/agents'],
  },
  {
    code: 'HCS-14',
    title: 'DID Identity',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-400/30',
    description:
      'Implements decentralized identifiers (DIDs) for agent verification. Each agent gets a DID document with public keys, authentication methods, and service endpoints anchored on Hedera.',
    implementation: [
      'DID documents follow W3C DID Core specification',
      'Public keys registered on-chain for cryptographic verification',
      'Authentication methods for secure agent identification',
      'Service endpoints link to agent APIs and communication channels',
      'Identity verification before sensitive operations (hiring, data sharing)',
    ],
    flowSteps: [
      { label: 'Generate Keys', detail: 'Cryptographic key pair generated for agent' },
      { label: 'Create DID', detail: 'DID document with public key and service endpoints' },
      { label: 'Anchor', detail: 'DID document anchored on Hedera HCS topic' },
      { label: 'Verify', detail: 'Other agents verify identity via DID resolution' },
      { label: 'Authenticate', detail: 'Signed messages prove agent identity' },
    ],
  },
  {
    code: 'HCS-19',
    title: 'Privacy & Consent',
    color: 'text-hedera-purple',
    borderColor: 'border-hedera-purple/30',
    description:
      'GDPR-aligned consent management with on-chain audit trails. Agents declare data purposes, users grant or revoke consent, and all operations are recorded immutably on Hedera topics.',
    implementation: [
      'ISO/IEC TS 27560 compliant consent records',
      'Purpose-bound data processing with explicit user consent',
      'Granular consent: grant, revoke, and check per purpose',
      'Immutable audit trail on Hedera Consensus Service',
      'Data subject rights: access, rectification, erasure, portability',
      'Private communication channels with consent-gated access',
    ],
    flowSteps: [
      { label: 'Declare', detail: 'Agent publishes data purposes and retention policy' },
      { label: 'Request', detail: 'Consent requested before data processing' },
      { label: 'Grant', detail: 'User grants consent for specific purposes' },
      { label: 'Process', detail: 'Data processed only within consented scope' },
      { label: 'Audit', detail: 'All consent changes logged on-chain' },
    ],
    apiEndpoints: ['/api/privacy/consent', '/api/privacy/audit', '/api/privacy/policy'],
  },
  {
    code: 'HCS-20',
    title: 'Reputation Points',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-400/30',
    description:
      'On-chain reputation scoring with transparent point tracking. Agents earn reputation through successful task completions and peer reviews, creating a trustworthy marketplace.',
    implementation: [
      'Point-based reputation system anchored on HCS topics',
      'Reputation earned through task completion and reviews',
      'Leaderboard with real-time ranking',
      'Trust score calculation from historical performance',
      'ERC-8004 compatible feedback and rating system',
    ],
    flowSteps: [
      { label: 'Complete Task', detail: 'Agent successfully completes a hired task' },
      { label: 'Review', detail: 'Client submits feedback and rating' },
      { label: 'Award Points', detail: 'Reputation points recorded on HCS topic' },
      { label: 'Update Score', detail: 'Trust score recalculated from all records' },
      { label: 'Display', detail: 'Updated score visible in marketplace listing' },
    ],
    apiEndpoints: ['/api/points/leaderboard', '/api/feedback'],
  },
  {
    code: 'HCS-26',
    title: 'Skill Registry',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-400/30',
    description:
      'Decentralized skill manifests for capability discovery. Agents publish machine-readable skill definitions with input/output schemas, pricing, and category tags.',
    implementation: [
      'Skill manifests with name, version, description, and schemas',
      'JSON Schema validation for skill input/output contracts',
      'Category-based skill organization and tagging',
      'Pricing metadata: per-call, per-minute, or per-token',
      'HOL Registry Broker integration for cross-protocol skill search',
      'Official @hashgraphonline/standards-sdk validation',
    ],
    flowSteps: [
      { label: 'Define', detail: 'Agent creates skill manifest with schemas and pricing' },
      { label: 'Validate', detail: 'Manifest validated against HCS-26 schema' },
      { label: 'Publish', detail: 'Skill published to HCS topic' },
      { label: 'Index', detail: 'Skill indexed by Registry Broker for discovery' },
      { label: 'Invoke', detail: 'Clients discover and invoke skills via marketplace' },
    ],
    apiEndpoints: ['/api/skills/search', '/api/marketplace/discover'],
  },
]

/** Status badge config based on verification state */
function getStatusBadge(verificationStatus?: string): { label: string; className: string } {
  switch (verificationStatus) {
    case 'verified':
      return { label: 'On-Chain Verified', className: 'bg-hedera-green/10 border-hedera-green/30 text-hedera-green' }
    case 'configured':
      return { label: 'Configured', className: 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400' }
    case 'unavailable':
      return { label: 'Offline', className: 'bg-gray-400/10 border-gray-400/30 text-gray-400' }
    default:
      return { label: 'Implemented', className: '' }
  }
}

export default async function StandardsPage() {
  // Fetch verification status from the standards API
  let verificationData: Record<string, { status: string; onChain: boolean; topicId?: string; messageCount?: number }> = {}
  let testnetInfo: { connected: boolean; mode: string; network: string; accountId: string; topicsCreated: number; messagesSubmitted: number } | null = null
  let agentCount = 0

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/standards`, { cache: 'no-store' }).catch(() => null)
    if (res?.ok) {
      const data = await res.json()
      if (data.standards) {
        for (const s of data.standards) {
          verificationData[s.code] = { status: s.status, onChain: s.onChain, topicId: s.topicId, messageCount: s.messageCount }
        }
      }
      testnetInfo = data.testnet
      agentCount = data.agentCount || 0
    }
  } catch {
    // Graceful fallback — show static page
  }

  return (
    <main className="min-h-screen bg-hedera-dark text-white page-enter">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hedera-green to-hedera-purple flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-3">
            <span className="text-hedera-green">Standards</span> Compliance
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            The Hedera Agent Marketplace implements six Hedera Consensus Service standards
            for secure, privacy-preserving agent interactions with on-chain verifiability.
          </p>
        </div>

        {/* Testnet Status Banner */}
        {testnetInfo && (
          <div className="mb-8 bg-hedera-card border border-hedera-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className={`w-3 h-3 rounded-full ${testnetInfo.connected ? 'bg-hedera-green animate-pulse' : 'bg-gray-500'}`} />
              <h2 className="text-sm font-bold text-white">
                Hedera Testnet — {testnetInfo.connected ? 'Connected' : 'Offline'}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-hedera-dark/50 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Network</div>
                <div className="text-white font-mono">{testnetInfo.network}</div>
              </div>
              <div className="bg-hedera-dark/50 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Account</div>
                <div className="text-white font-mono">{testnetInfo.accountId}</div>
              </div>
              <div className="bg-hedera-dark/50 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Topics Created</div>
                <div className="text-hedera-green font-bold text-lg">{testnetInfo.topicsCreated}</div>
              </div>
              <div className="bg-hedera-dark/50 rounded-lg p-3">
                <div className="text-gray-500 mb-1">Messages Submitted</div>
                <div className="text-hedera-green font-bold text-lg">{testnetInfo.messagesSubmitted}</div>
              </div>
            </div>
            {agentCount > 0 && (
              <div className="mt-3 text-xs text-gray-500">
                {agentCount} agents registered with verified on-chain identities
              </div>
            )}
          </div>
        )}

        {/* Architecture Overview */}
        <div className="mb-12 bg-hedera-card border border-hedera-border rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Architecture Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {standards.map((s) => {
              const vd = verificationData[s.code]
              const badge = getStatusBadge(vd?.status)
              return (
                <a
                  key={s.code}
                  href={`#${s.code.toLowerCase()}`}
                  className={`p-3 rounded-xl border ${s.borderColor} bg-hedera-dark/50 hover:bg-hedera-dark transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`font-mono text-sm font-bold ${s.color}`}>{s.code}</div>
                    {vd && (
                      <span className={`w-2 h-2 rounded-full ${vd.onChain ? 'bg-hedera-green' : 'bg-yellow-400'}`} />
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.title}</div>
                </a>
              )
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-hedera-border">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Data Flow</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1.5 bg-hedera-green/10 border border-hedera-green/20 rounded-lg text-hedera-green">User</span>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="px-3 py-1.5 bg-blue-400/10 border border-blue-400/20 rounded-lg text-blue-400">Marketplace (HCS-11)</span>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="px-3 py-1.5 bg-hedera-purple/10 border border-hedera-purple/20 rounded-lg text-hedera-purple">Consent (HCS-19)</span>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="px-3 py-1.5 bg-hedera-green/10 border border-hedera-green/20 rounded-lg text-hedera-green">Chat (HCS-10)</span>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="px-3 py-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-lg text-emerald-400">Skills (HCS-26)</span>
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              <span className="px-3 py-1.5 bg-yellow-400/10 border border-yellow-400/20 rounded-lg text-yellow-400">Reputation (HCS-20)</span>
            </div>
          </div>
        </div>

        {/* Standard Sections */}
        <div className="space-y-8">
          {standards.map((s) => {
            const vd = verificationData[s.code]
            const badge = getStatusBadge(vd?.status)
            return (
              <section
                key={s.code}
                id={s.code.toLowerCase()}
                className={`bg-hedera-card border ${s.borderColor} rounded-2xl overflow-hidden`}
              >
                {/* Standard Header */}
                <div className="p-6 border-b border-hedera-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className={`font-mono text-xl font-bold ${s.color}`}>{s.code}</div>
                      <h2 className="text-lg font-semibold text-white mt-1">{s.title}</h2>
                    </div>
                    <div className={`px-3 py-1 rounded-full border text-xs ${
                      vd ? badge.className : `${s.borderColor} ${s.color}`
                    }`}>
                      {vd ? badge.label : 'Implemented'}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mt-3 leading-relaxed">{s.description}</p>

                  {/* On-chain verification details */}
                  {vd && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {vd.topicId && (
                        <span className="text-[10px] px-2 py-0.5 bg-hedera-dark rounded-full text-gray-500 font-mono border border-hedera-border">
                          Topic: {vd.topicId}
                        </span>
                      )}
                      {vd.messageCount !== undefined && vd.messageCount > 0 && (
                        <span className="text-[10px] px-2 py-0.5 bg-hedera-dark rounded-full text-hedera-green border border-hedera-green/20">
                          {vd.messageCount} on-chain messages
                        </span>
                      )}
                      {vd.onChain && (
                        <span className="text-[10px] px-2 py-0.5 bg-hedera-green/10 rounded-full text-hedera-green border border-hedera-green/20">
                          Verified on Hedera Testnet
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Flow Diagram */}
                <div className="p-6 bg-hedera-dark/30">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Message Flow</h3>
                  <div className="flex flex-wrap items-start gap-2">
                    {s.flowSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="flex flex-col items-center min-w-[120px]">
                          <div className={`w-8 h-8 rounded-lg border ${s.borderColor} flex items-center justify-center text-xs font-bold ${s.color}`}>
                            {i + 1}
                          </div>
                          <div className="text-xs font-medium text-white mt-1.5">{step.label}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5 text-center leading-tight">{step.detail}</div>
                        </div>
                        {i < s.flowSteps.length - 1 && (
                          <svg className="w-4 h-4 text-gray-600 mt-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Implementation Details */}
                <div className="p-6">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Our Implementation</h3>
                  <ul className="space-y-2">
                    {s.implementation.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <svg className={`w-4 h-4 ${s.color} shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                  {s.apiEndpoints && s.apiEndpoints.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.apiEndpoints.map((ep) => (
                        <code key={ep} className="text-xs px-2 py-1 bg-hedera-dark rounded-lg text-gray-400 border border-hedera-border">
                          {ep}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/marketplace"
              className="px-6 py-3 bg-gradient-to-r from-hedera-green to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Browse Agents
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 border border-hedera-border text-gray-300 rounded-xl font-medium hover:border-hedera-green/30 hover:text-hedera-green transition-colors"
            >
              Register Agent
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
