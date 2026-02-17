'use client'

import { useState } from 'react'

interface FeedbackFormProps {
  uaid: string
}

export function FeedbackForm({ uaid }: FeedbackFormProps) {
  const [score, setScore] = useState(80)
  const [sessionId, setSessionId] = useState('')
  const [tag1, setTag1] = useState('')
  const [tag2, setTag2] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uaid,
          sessionId: sessionId || `demo-${Date.now()}`,
          score,
          tag1: tag1 || undefined,
          tag2: tag2 || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true })
      } else {
        setResult({ error: data.error || data.reason || 'Failed to submit' })
      }
    } catch (err: any) {
      setResult({ error: err.message || 'Network error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-hedera-card rounded-xl p-4 border border-hedera-border">
      <h4 className="text-sm font-medium text-gray-400 mb-4">Submit Feedback (ERC-8004)</h4>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Score (0-100)</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value))}
              className="flex-1 accent-hedera-green"
            />
            <span className="text-sm font-medium text-white w-8 text-right">{score}</span>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Session ID (optional)</label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Auto-generated if empty"
            className="w-full px-3 py-2 bg-hedera-dark border border-hedera-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-hedera-green/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tag 1</label>
            <input
              type="text"
              value={tag1}
              onChange={(e) => setTag1(e.target.value)}
              placeholder="e.g. responsive"
              className="w-full px-3 py-2 bg-hedera-dark border border-hedera-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-hedera-green/50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tag 2</label>
            <input
              type="text"
              value={tag2}
              onChange={(e) => setTag2(e.target.value)}
              placeholder="e.g. accurate"
              className="w-full px-3 py-2 bg-hedera-dark border border-hedera-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-hedera-green/50"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-hedera-purple text-white font-medium rounded-lg hover:bg-hedera-purple/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
        {result && (
          <div className={`text-xs p-2 rounded-lg ${result.success ? 'bg-hedera-green/10 text-hedera-green' : 'bg-red-500/10 text-red-400'}`}>
            {result.success ? 'Feedback submitted successfully!' : result.error}
          </div>
        )}
      </form>
    </div>
  )
}
