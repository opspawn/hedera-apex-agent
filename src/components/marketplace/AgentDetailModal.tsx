'use client'

import { useState, useEffect } from 'react'
import type { BrokerAgent } from './AgentCard'
import { FeedbackForm } from './FeedbackForm'

interface AgentDetailModalProps {
  agent: BrokerAgent
  onClose: () => void
  onChat: (agent: BrokerAgent) => void
}

interface SkillData {
  brokerSkills?: any[]
  localSkills?: any
  skills?: any[]
}

interface FeedbackData {
  uaid: string
  feedback: any
}

function TrustScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-hedera-green' : score >= 40 ? 'bg-yellow-400' : 'bg-red-400'
  const label = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low'

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400">Trust Score</span>
        <span className={`text-sm font-bold ${score >= 70 ? 'text-hedera-green' : score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
          {score}/100 <span className="text-[10px] font-normal text-gray-500">({label})</span>
        </span>
      </div>
      <div className="w-full h-2 bg-hedera-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  )
}

function ProtocolBadge({ protocol }: { protocol: string }) {
  const colors: Record<string, string> = {
    'hcs-10': 'bg-hedera-green/10 border-hedera-green/20 text-hedera-green',
    'hcs-11': 'bg-blue-400/10 border-blue-400/20 text-blue-400',
    'hcs-14': 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400',
    'hcs-19': 'bg-hedera-purple/10 border-hedera-purple/20 text-hedera-purple',
    'hcs-20': 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400',
    'hcs-26': 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
  }
  const colorClass = colors[protocol.toLowerCase()] || 'bg-hedera-green/10 border-hedera-green/20 text-hedera-green'

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium ${colorClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {protocol.toUpperCase()}
    </span>
  )
}

export function AgentDetailModal({ agent, onClose, onChat }: AgentDetailModalProps) {
  const [skills, setSkills] = useState<SkillData | null>(null)
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [loadingSkills, setLoadingSkills] = useState(true)
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'feedback'>('overview')

  useEffect(() => {
    async function fetchSkills() {
      try {
        const agentName = (agent.name || 'agent').split(' ')[0].toLowerCase()
        const res = await fetch(`/api/skills/search?q=${encodeURIComponent(agentName)}&limit=10`)
        const data = await res.json()
        setSkills(data)
      } catch {
        setSkills(null)
      } finally {
        setLoadingSkills(false)
      }
    }

    async function fetchFeedback() {
      if (!agent.uaid) {
        setLoadingFeedback(false)
        return
      }
      try {
        const res = await fetch(`/api/feedback?uaid=${encodeURIComponent(agent.uaid)}`)
        const data = await res.json()
        setFeedback(data)
      } catch {
        setFeedback(null)
      } finally {
        setLoadingFeedback(false)
      }
    }

    fetchSkills()
    fetchFeedback()
  }, [agent])

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  // Prefer embedded skills from local agents, fall back to fetched skills
  const allSkills = agent.skills && agent.skills.length > 0
    ? agent.skills
    : (skills?.brokerSkills || skills?.skills || [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Agent details: ${agent.name || 'Unknown Agent'}`} onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" aria-hidden="true" />
      <div
        className="relative bg-hedera-dark border border-hedera-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-hedera-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-hedera-purple/30 to-hedera-green/30 flex items-center justify-center border border-hedera-border shrink-0">
                <span className="text-xl sm:text-2xl font-bold text-hedera-green">
                  {(agent.name || 'A').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{agent.name || 'Unknown Agent'}</h2>
                {agent.uaid && (
                  <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">{agent.uaid}</p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {agent.available && (
                    <span className="flex items-center gap-1 text-xs text-hedera-green">
                      <span className="w-1.5 h-1.5 rounded-full bg-hedera-green animate-pulse-glow" />
                      Online
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{agent.registry || 'HOL Registry'}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close agent details"
              className="p-2 rounded-lg hover:bg-hedera-card transition-colors text-gray-400 hover:text-white shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hedera-border">
          {(['overview', 'skills', 'feedback'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium capitalize transition-colors relative ${
                activeTab === tab
                  ? 'text-hedera-green'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-hedera-green" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Description</h3>
                <p className="text-white text-sm leading-relaxed">{agent.description || 'No description available'}</p>
              </div>

              {/* Trust Score Visualization */}
              <TrustScoreBar score={agent.trust_score ?? 0} />

              {agent.capabilities && agent.capabilities.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Capabilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.capabilities.map((cap, i) => (
                      <span
                        key={i}
                        className="text-xs px-3 py-1 rounded-full bg-hedera-purple/10 border border-hedera-purple/20 text-hedera-purple"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Protocol badges */}
              {agent.protocols && agent.protocols.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Supported Protocols</h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.protocols.map((p, i) => (
                      <ProtocolBadge key={i} protocol={p} />
                    ))}
                  </div>
                </div>
              )}

              {/* HCS-19 Privacy Consent */}
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">HCS-19 Privacy Compliance</h3>
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                  agent.has_privacy_consent
                    ? 'bg-hedera-green/5 border-hedera-green/20'
                    : 'bg-yellow-500/5 border-yellow-500/20'
                }`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    agent.has_privacy_consent ? 'bg-hedera-green/10' : 'bg-yellow-500/10'
                  }`}>
                    {agent.has_privacy_consent ? (
                      <svg className="w-4 h-4 text-hedera-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${agent.has_privacy_consent ? 'text-hedera-green' : 'text-yellow-400'}`}>
                      {agent.has_privacy_consent ? 'Privacy consent granted' : 'No consent on file'}
                    </span>
                    {agent.verification && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-hedera-card border border-hedera-border text-gray-400 ml-2">
                        {agent.verification}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {agent.endpoint && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">A2A Endpoint</h3>
                  <code className="text-xs text-hedera-green bg-hedera-card px-3 py-1.5 rounded-lg block break-all">
                    {agent.endpoint}
                  </code>
                </div>
              )}

              {agent.payment_address && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Payment Address</h3>
                  <code className="text-xs text-cyan-400 bg-hedera-card px-3 py-1.5 rounded-lg block break-all">
                    {agent.payment_address}
                  </code>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-hedera-card rounded-xl p-4 border border-hedera-border text-center">
                  <p className="text-xs text-gray-400 mb-1">Trust</p>
                  <p className="text-2xl font-bold text-hedera-green">{agent.trust_score ?? 0}</p>
                </div>
                <div className="bg-hedera-card rounded-xl p-4 border border-hedera-border text-center">
                  <p className="text-xs text-gray-400 mb-1">Skills</p>
                  <p className="text-2xl font-bold text-white">{agent.skills?.length ?? 0}</p>
                </div>
                <div className="bg-hedera-card rounded-xl p-4 border border-hedera-border text-center">
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <p className="text-sm font-medium text-hedera-green capitalize">{agent.status || 'Active'}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => onChat(agent)}
                  className="flex-1 py-3 bg-gradient-to-r from-hedera-green to-emerald-600 text-hedera-dark font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chat with Agent
                </button>
                {agent.agent_id && (
                  <button
                    onClick={() => {
                      const params = new URLSearchParams()
                      params.set('agentId', agent.agent_id)
                      params.set('name', agent.name || 'Unknown Agent')
                      window.location.href = `/chat?${params.toString()}`
                    }}
                    className="px-4 py-3 border border-cyan-400/30 text-cyan-400 font-medium rounded-xl hover:bg-cyan-400/10 transition-colors text-sm flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    HCS-10
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div>
              {loadingSkills ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-hedera-card rounded-xl p-4 border border-hedera-border animate-pulse">
                      <div className="h-4 bg-hedera-border rounded w-1/3 mb-2" />
                      <div className="h-3 bg-hedera-border rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : allSkills.length > 0 ? (
                <div className="space-y-3">
                  {allSkills.map((skill: any, i: number) => (
                    <div key={i} className="bg-hedera-card rounded-xl p-4 border border-hedera-border hover:border-hedera-green/20 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-white">{skill.name || skill.display_name || 'Unnamed Skill'}</h4>
                        <div className="flex items-center gap-2">
                          {skill.pricing && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-hedera-green/10 text-hedera-green font-medium">
                              {skill.pricing.amount} {skill.pricing.token}/{skill.pricing.unit}
                            </span>
                          )}
                          {skill.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-hedera-purple/10 text-hedera-purple">
                              {skill.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-400 mb-2">{skill.description || skill.bio || 'No description'}</p>
                      {skill.tags && skill.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {skill.tags.slice(0, 5).map((tag: string, j: number) => (
                            <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-hedera-border text-gray-400">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">No skills found for this agent</p>
                  <p className="text-xs text-gray-500 mt-1">Skills may be registered via HCS-26</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {loadingFeedback ? (
                <div className="bg-hedera-card rounded-xl p-4 border border-hedera-border animate-pulse">
                  <div className="h-4 bg-hedera-border rounded w-1/4 mb-2" />
                  <div className="h-8 bg-hedera-border rounded w-1/3" />
                </div>
              ) : feedback?.feedback ? (
                <div className="bg-hedera-card rounded-xl p-4 border border-hedera-border">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Feedback Summary</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Average Score</p>
                      <p className="text-xl font-bold text-hedera-green">
                        {feedback.feedback.averageScore ?? feedback.feedback.average ?? 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Total Reviews</p>
                      <p className="text-xl font-bold text-white">
                        {feedback.feedback.totalReviews ?? feedback.feedback.count ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-sm font-medium text-hedera-green">Active</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-hedera-card rounded-xl p-4 border border-hedera-border text-center">
                  <p className="text-gray-400">No feedback data available yet</p>
                </div>
              )}

              {agent.uaid && <FeedbackForm uaid={agent.uaid} />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
