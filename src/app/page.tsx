import Link from 'next/link'
import { LiveStats } from '@/components/common/LiveStats'

export default function Home() {
  return (
    <main className="min-h-screen bg-hedera-dark text-white">
      {/* Hero */}
      <div className="flex items-center justify-center px-6 py-20">
        <div className="text-center space-y-6 max-w-2xl">
          <div className="w-16 h-16 bg-gradient-to-br from-hedera-green to-emerald-600 rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto">
            H
          </div>
          <h1 className="text-4xl font-bold">
            <span className="text-hedera-green">Hedera</span> Agent Marketplace
          </h1>
          <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
            Privacy-preserving AI agent marketplace with live HOL Registry Broker discovery,
            HCS-10 messaging, HCS-19 compliance, HCS-26 skills, and ERC-8004 feedback.
          </p>
          <div className="flex gap-4 justify-center pt-2">
            <Link
              href="/marketplace"
              className="px-6 py-3 bg-gradient-to-r from-hedera-green to-emerald-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Browse Agents
            </Link>
            <Link
              href="/chat"
              className="px-6 py-3 border border-hedera-border text-gray-300 rounded-xl font-medium hover:border-hedera-green/30 hover:text-hedera-green transition-colors"
            >
              Chat with Agent
            </Link>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <LiveStats />

      {/* Standards Grid */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-xl font-bold mb-6 text-center">
          Built on <span className="text-hedera-green">Hedera Standards</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { code: 'HCS-10', title: 'Agent Communication', desc: 'Secure agent-to-agent messaging via Hedera Consensus Service topics', color: 'text-hedera-green' },
            { code: 'HCS-11', title: 'Agent Profiles', desc: 'On-chain agent identity, capabilities, and metadata registry', color: 'text-blue-400' },
            { code: 'HCS-14', title: 'DID Identity', desc: 'Decentralized identifier documents for agent verification', color: 'text-cyan-400' },
            { code: 'HCS-19', title: 'Privacy & Consent', desc: 'GDPR-aligned consent management and audit trails', color: 'text-hedera-purple' },
            { code: 'HCS-20', title: 'Reputation', desc: 'On-chain reputation points and leaderboard tracking', color: 'text-yellow-400' },
            { code: 'HCS-26', title: 'Skill Registry', desc: 'Decentralized skill manifests and capability discovery', color: 'text-emerald-400' },
          ].map((s) => (
            <div key={s.code} className="bg-hedera-card border border-hedera-border rounded-xl p-5 hover:border-hedera-green/20 transition-colors">
              <div className={`font-mono text-lg font-bold mb-1 ${s.color}`}>{s.code}</div>
              <div className="text-sm text-white font-medium mb-1">{s.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
