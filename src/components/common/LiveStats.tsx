'use client'

import { useState, useEffect } from 'react'

interface StatsData {
  agents: number
  source: string
  brokerAvailable: boolean
  credits: number
}

export function LiveStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [discoverRes, creditsRes, statusRes] = await Promise.allSettled([
          fetch('/api/marketplace/discover?q=agent&limit=1').then(r => r.json()),
          fetch('/api/credits').then(r => r.json()),
          fetch('/api/chat/status').then(r => r.json()),
        ])

        const discover = discoverRes.status === 'fulfilled' ? discoverRes.value : null
        const credits = creditsRes.status === 'fulfilled' ? creditsRes.value : null
        const status = statusRes.status === 'fulfilled' ? statusRes.value : null

        setStats({
          agents: discover?.total || 0,
          source: discover?.source || 'unknown',
          brokerAvailable: status?.brokerRelayAvailable || false,
          credits: credits?.balance?.credits ?? credits?.balance?.balance ?? 0,
        })
      } catch {
        // Show zeros rather than hiding the section entirely
        setStats({ agents: 0, source: 'offline', brokerAvailable: false, credits: 0 })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-hedera-card border border-hedera-border rounded-xl p-5 animate-pulse">
              <div className="h-3 w-20 bg-hedera-border rounded mb-3" />
              <div className="h-8 w-16 bg-hedera-border rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const statItems = [
    { label: 'Registered Agents', value: stats?.agents ?? '...', color: 'text-hedera-green' },
    { label: 'Data Source', value: stats?.source ?? 'N/A', color: 'text-white' },
    { label: 'Broker Relay', value: stats?.brokerAvailable ? 'Available' : 'Offline', color: stats?.brokerAvailable ? 'text-hedera-green' : 'text-gray-500' },
    { label: 'HOL Credits', value: stats?.credits ?? 0, color: 'text-hedera-purple' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 pb-12">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((item, i) => (
          <div
            key={item.label}
            className="bg-hedera-card border border-hedera-border rounded-xl p-5 animate-slide-up hover:border-hedera-green/20 transition-colors"
            style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
          >
            <p className="text-xs text-gray-500 mb-2">{item.label}</p>
            <p className={`text-2xl font-bold ${item.color} capitalize`}>
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
