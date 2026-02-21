'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SearchBar } from '@/components/marketplace/SearchBar'
import { AgentCard, type BrokerAgent } from '@/components/marketplace/AgentCard'
import { AgentDetailModal } from '@/components/marketplace/AgentDetailModal'

export default function MarketplacePage() {
  const router = useRouter()
  const [agents, setAgents] = useState<BrokerAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<string>('')
  const [total, setTotal] = useState(0)
  const [selectedAgent, setSelectedAgent] = useState<BrokerAgent | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [brokerUnavailable, setBrokerUnavailable] = useState(false)
  const isBackgroundRefresh = useRef(false)

  const fetchAgents = useCallback(async (query: string, mode: 'hybrid' | 'broker' | 'local' = 'hybrid', background = false) => {
    if (!background) {
      setLoading(true)
      setError(null)
    }
    isBackgroundRefresh.current = background
    setSearchQuery(query)

    try {
      const q = query || 'agent'
      const res = await fetch(`/api/marketplace/discover?q=${encodeURIComponent(q)}&mode=${mode}&limit=50`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch agents')
      }

      const allAgents = [
        ...(data.agents || []),
        ...(data.localAgents || []),
      ]

      // Sort: agents with richer data (trust scores, skills, descriptions) first
      allAgents.sort((a: any, b: any) => {
        const aScore = (a.trust_score || 0) + (a.skills?.length || 0) * 10 + (a.available ? 50 : 0)
        const bScore = (b.trust_score || 0) + (b.skills?.length || 0) * 10 + (b.available ? 50 : 0)
        return bScore - aScore
      })

      setAgents(allAgents)
      setTotal(data.total || allAgents.length)
      setSource(data.source || mode)
      setBrokerUnavailable(!!data.brokerUnavailable)
      setLastUpdated(new Date())
      if (background) setError(null)
    } catch (err: any) {
      if (!background) {
        setError(err.message || 'Failed to load agents')
        setAgents([])
      }
    } finally {
      if (!background) setLoading(false)
      isBackgroundRefresh.current = false
    }
  }, [])

  useEffect(() => {
    fetchAgents('agent', 'local')
  }, [fetchAgents])

  // Auto-refresh every 30 seconds (background, no loading spinner)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAgents(searchQuery || 'agent', 'local', true)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchAgents, searchQuery])

  const handleSearch = useCallback((query: string, mode: 'hybrid' | 'broker' | 'local') => {
    fetchAgents(query, mode)
  }, [fetchAgents])

  const handleChatWithAgent = useCallback((agent: BrokerAgent) => {
    setSelectedAgent(null)
    const params = new URLSearchParams()
    if (agent.uaid) params.set('uaid', agent.uaid)
    params.set('name', agent.name || 'Unknown Agent')
    router.push(`/chat?${params.toString()}`)
  }, [router])

  return (
    <main className="min-h-screen bg-hedera-dark text-white page-enter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-hedera-green">Agent</span> Marketplace
          </h1>
          <p className="text-gray-400">
            Discover and interact with AI agents registered on the HOL Registry Broker
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-sm text-gray-400">
              {loading ? 'Searching...' : `${total} agents found`}
            </span>
            {source && !loading && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-hedera-card border border-hedera-border text-gray-500">
                Source: {source}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {searchQuery && !loading && (
              <span className="text-xs text-gray-500 hidden sm:inline">
                Query: &quot;{searchQuery}&quot;
              </span>
            )}
            {lastUpdated && !loading && (
              <span className="text-xs text-gray-600">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Broker unavailable notice */}
        {brokerUnavailable && !error && (
          <div className="mb-6 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Registry Broker is currently unreachable. Showing locally registered agents only.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm animate-slide-up">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-red-400 font-medium">Could not load agents</p>
                <p className="text-red-400/70 text-xs mt-0.5">{error}</p>
                <button
                  onClick={() => fetchAgents(searchQuery || 'agent')}
                  className="mt-2 px-3 py-1.5 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-hedera-card border border-hedera-border rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-hedera-border" />
                  <div>
                    <div className="h-4 w-32 bg-hedera-border rounded mb-1" />
                    <div className="h-3 w-24 bg-hedera-border rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-hedera-border rounded mb-2" />
                <div className="h-3 w-2/3 bg-hedera-border rounded mb-4" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-16 bg-hedera-border rounded-full" />
                  <div className="h-5 w-12 bg-hedera-border rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Agent Grid */}
        {!loading && agents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent, i) => (
              <AgentCard
                key={agent.agent_id + '-' + i}
                agent={agent}
                onSelect={setSelectedAgent}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && agents.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-hedera-card border border-hedera-border flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-1">No agents found</h3>
            <p className="text-sm text-gray-500 mb-4">Try a different search query or mode</p>
            <button
              onClick={() => router.push('/register')}
              className="px-5 py-2.5 bg-gradient-to-r from-hedera-green to-emerald-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Register Your Agent
            </button>
          </div>
        )}
      </div>

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onChat={handleChatWithAgent}
        />
      )}
    </main>
  )
}
