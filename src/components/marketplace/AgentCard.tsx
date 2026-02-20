'use client'

interface BrokerAgent {
  agent_id: string
  name: string
  description: string
  uaid?: string
  endpoint?: string
  protocols?: string[]
  capabilities?: string[]
  trust_score?: number
  registry?: string
  available?: boolean
  source?: string
  similarity?: number
  skills?: Array<{
    id: string
    name: string
    description?: string
    category?: string
    tags?: string[]
    input_schema?: Record<string, unknown>
    output_schema?: Record<string, unknown>
    pricing: { amount: number; token: string; unit: string }
  }>
  payment_address?: string
  status?: string
  reputation_score?: number
  verification?: string
  has_privacy_consent?: boolean
}

interface AgentCardProps {
  agent: BrokerAgent
  onSelect: (agent: BrokerAgent) => void
}

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  const trustScore = agent.trust_score ?? 0
  const trustColor = trustScore >= 70 ? 'text-hedera-green' : trustScore >= 40 ? 'text-yellow-400' : 'text-gray-400'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View details for ${agent.name || 'Unknown Agent'}`}
      onClick={() => onSelect(agent)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(agent); } }}
      className="bg-hedera-card border border-hedera-border rounded-xl p-5 hover:border-hedera-green/40 transition-all cursor-pointer group animate-slide-up focus:outline-none focus:ring-2 focus:ring-hedera-green/40 focus:ring-offset-1 focus:ring-offset-hedera-dark"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-hedera-purple/30 to-hedera-green/30 flex items-center justify-center border border-hedera-border group-hover:border-hedera-green/30 transition-colors" aria-hidden="true">
            <span className="text-lg font-bold text-hedera-green">
              {(agent.name || 'A').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-hedera-green transition-colors truncate max-w-[200px]">
              {agent.name || 'Unknown Agent'}
            </h3>
            {agent.uaid && (
              <p className="text-xs text-gray-500 font-mono truncate max-w-[200px]">
                {agent.uaid}
              </p>
            )}
          </div>
        </div>
        {agent.available && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-hedera-green/10 border border-hedera-green/20">
            <span className="w-1.5 h-1.5 rounded-full bg-hedera-green" />
            <span className="text-[10px] text-hedera-green font-medium">Live</span>
          </span>
        )}
      </div>

      <p className="text-sm text-gray-400 mb-3 line-clamp-2 min-h-[40px]">
        {agent.description || 'No description available'}
      </p>

      {/* Skills / capabilities */}
      {(agent.capabilities && agent.capabilities.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {agent.capabilities.slice(0, 4).map((cap, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-full bg-hedera-purple/10 border border-hedera-purple/20 text-hedera-purple"
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 4 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-hedera-border text-gray-500">
              +{agent.capabilities.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Pricing range from skills */}
      {agent.skills && agent.skills.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-gray-500">
            {agent.skills.length} skill{agent.skills.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[10px] text-hedera-green font-medium">
            {Math.min(...agent.skills.map(s => s.pricing.amount))}–{Math.max(...agent.skills.map(s => s.pricing.amount))} HBAR
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-hedera-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" aria-label={`Trust score: ${trustScore} out of 100`}>
            <svg className={`w-3.5 h-3.5 ${trustColor}`} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className={`text-xs font-medium ${trustColor}`}>{trustScore}</span>
          </div>
          {agent.protocols && agent.protocols.length > 0 && (
            <span className="text-[10px] text-gray-500">
              {agent.protocols.join(', ')}
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-500 bg-hedera-dark px-2 py-0.5 rounded">
          {agent.source === 'vector-search' ? 'Semantic' : agent.registry || 'HOL'}
        </span>
      </div>
    </div>
  )
}

export type { BrokerAgent }
