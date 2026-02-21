'use client'

import { useState, useCallback } from 'react'

interface SearchBarProps {
  onSearch: (query: string, mode: 'hybrid' | 'broker' | 'local') => void
  loading?: boolean
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'hybrid' | 'broker' | 'local'>('broker')

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query, mode)
  }, [query, mode, onSearch])

  return (
    <form onSubmit={handleSubmit} className="w-full" role="search" aria-label="Search agents">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents by name, skill, or capability..."
            aria-label="Search agents by name, skill, or capability"
            className="w-full pl-10 pr-4 py-3 bg-hedera-card border border-hedera-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-hedera-green/50 focus:ring-1 focus:ring-hedera-green/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as any)}
            aria-label="Search mode"
            className="px-3 py-3 bg-hedera-card border border-hedera-border rounded-xl text-sm text-gray-400 focus:outline-none focus:border-hedera-green/50 cursor-pointer"
          >
            <option value="hybrid">Hybrid</option>
            <option value="broker">Broker</option>
            <option value="local">Local</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-hedera-green text-hedera-dark font-semibold rounded-xl hover:bg-hedera-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-1 sm:flex-none"
          >
          {loading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            'Search'
          )}
          </button>
        </div>
      </div>
    </form>
  )
}
