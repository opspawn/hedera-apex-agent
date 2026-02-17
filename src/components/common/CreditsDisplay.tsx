'use client'

import { useState, useEffect } from 'react'

interface CreditsData {
  accountId: string
  balance: any
  error?: string
}

export function CreditsDisplay() {
  const [credits, setCredits] = useState<CreditsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCredits() {
      try {
        const res = await fetch('/api/credits')
        const data = await res.json()
        setCredits(data)
      } catch {
        setCredits(null)
      } finally {
        setLoading(false)
      }
    }
    fetchCredits()
    const interval = setInterval(fetchCredits, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hedera-card border border-hedera-border">
        <div className="w-16 h-4 bg-hedera-border rounded animate-pulse" />
      </div>
    )
  }

  const balance = credits?.balance?.credits ?? credits?.balance?.balance ?? 0

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-hedera-card border border-hedera-border">
      <svg className="w-4 h-4 text-hedera-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
      <span className="text-sm font-medium text-white">{balance}</span>
      <span className="text-xs text-gray-500">credits</span>
    </div>
  )
}
