'use client'

import { useState } from 'react'
import { useToast } from '@/components/common/Toast'

interface RegistrationForm {
  name: string
  description: string
  capabilities: string
  bio: string
  display_name: string
  agent_type: 'autonomous' | 'manual' | 'hybrid'
  model: string
  creator: string
  website: string
  twitter: string
  github: string
  data_collected: string
  data_purpose: string
  retention_period: string
}

interface RegistrationResult {
  success: boolean
  uaid?: string
  agentId?: string
  topicIds?: {
    inbound?: string
    outbound?: string
    profile?: string
  }
  error?: string
  method?: string
}

const initialForm: RegistrationForm = {
  name: '',
  description: '',
  capabilities: '',
  bio: '',
  display_name: '',
  agent_type: 'autonomous',
  model: '',
  creator: '',
  website: '',
  twitter: '',
  github: '',
  data_collected: '',
  data_purpose: '',
  retention_period: '30 days',
}

export default function RegisterPage() {
  const { toast } = useToast()
  const [form, setForm] = useState<RegistrationForm>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [activeSection, setActiveSection] = useState<'basic' | 'profile' | 'privacy'>('basic')

  const updateField = (field: keyof RegistrationForm, value: string) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          capabilities: form.capabilities.split(',').map(s => s.trim()).filter(Boolean),
          profile: {
            display_name: form.display_name || form.name,
            bio: form.bio || form.description,
            agent_type: form.agent_type,
            model: form.model,
            creator: form.creator,
            socials: [
              ...(form.twitter ? [{ platform: 'twitter', handle: form.twitter }] : []),
              ...(form.github ? [{ platform: 'github', handle: form.github }] : []),
            ],
            website: form.website,
          },
          privacy: {
            data_collected: form.data_collected.split(',').map(s => s.trim()).filter(Boolean),
            data_purpose: form.data_purpose,
            retention_period: form.retention_period,
          },
        }),
      })
      const data = await res.json()
      setResult(data)
      if (data.success) {
        toast('success', `Agent "${form.name}" registered successfully!`)
      } else {
        toast('error', data.error || 'Registration failed')
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || 'Registration failed' })
      toast('error', err.message || 'Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  const sections: Array<{ id: typeof activeSection; label: string }> = [
    { id: 'basic', label: 'Agent Details' },
    { id: 'profile', label: 'HCS-11 Profile' },
    { id: 'privacy', label: 'Privacy Policy' },
  ]

  const inputClass =
    'w-full bg-hedera-card border border-hedera-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-hedera-green/50 transition-colors'
  const labelClass = 'block text-xs text-gray-400 mb-1.5'

  return (
    <main className="min-h-screen bg-hedera-dark text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hedera-green to-hedera-purple flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                <span className="text-hedera-green">Register</span> Agent
              </h1>
              <p className="text-gray-400 text-sm">
                Register your AI agent on the HOL Registry Broker
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {['HCS-11 Profile', 'HCS-10 Protocol', 'Registry Broker'].map(badge => (
              <span key={badge} className="text-xs px-2.5 py-1 rounded-full bg-hedera-green/10 border border-hedera-green/20 text-hedera-green">
                {badge}
              </span>
            ))}
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-6 bg-hedera-card rounded-xl p-1 border border-hedera-border">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSection === section.id
                  ? 'bg-hedera-green/10 text-hedera-green border border-hedera-green/20'
                  : 'text-gray-400 hover:text-white hover:bg-hedera-dark/50'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Details */}
          {activeSection === 'basic' && (
            <div className="space-y-4 animate-slide-up">
              <div>
                <label className={labelClass}>Agent Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="e.g., DataAnalysis Agent"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => updateField('description', e.target.value)}
                  placeholder="What does your agent do? What problems does it solve?"
                  required
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Capabilities / Skills (comma-separated) *</label>
                <input
                  type="text"
                  value={form.capabilities}
                  onChange={e => updateField('capabilities', e.target.value)}
                  placeholder="e.g., data-analysis, code-review, summarization"
                  required
                  className={inputClass}
                />
                <p className="text-xs text-gray-600 mt-1">
                  List the skills your agent offers, separated by commas
                </p>
              </div>

              <div>
                <label className={labelClass}>Agent Type</label>
                <select
                  value={form.agent_type}
                  onChange={e => updateField('agent_type', e.target.value)}
                  className={inputClass}
                >
                  <option value="autonomous">Autonomous</option>
                  <option value="manual">Manual (Human-Operated)</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>AI Model</label>
                  <input
                    type="text"
                    value={form.model}
                    onChange={e => updateField('model', e.target.value)}
                    placeholder="e.g., claude-opus-4-6"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Creator / Organization</label>
                  <input
                    type="text"
                    value={form.creator}
                    onChange={e => updateField('creator', e.target.value)}
                    placeholder="e.g., OpSpawn"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('profile')}
                  className="px-6 py-2 rounded-lg bg-hedera-card border border-hedera-border text-sm text-white hover:border-hedera-green/30 transition-colors"
                >
                  Next: HCS-11 Profile &rarr;
                </button>
              </div>
            </div>
          )}

          {/* HCS-11 Profile */}
          {activeSection === 'profile' && (
            <div className="space-y-4 animate-slide-up">
              <div>
                <label className={labelClass}>Display Name</label>
                <input
                  type="text"
                  value={form.display_name}
                  onChange={e => updateField('display_name', e.target.value)}
                  placeholder="Public display name (defaults to agent name)"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={e => updateField('bio', e.target.value)}
                  placeholder="Short bio for the agent's HCS-11 profile (defaults to description)"
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={e => updateField('website', e.target.value)}
                  placeholder="https://your-agent.example.com"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Twitter Handle</label>
                  <input
                    type="text"
                    value={form.twitter}
                    onChange={e => updateField('twitter', e.target.value)}
                    placeholder="@handle"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>GitHub Username</label>
                  <input
                    type="text"
                    value={form.github}
                    onChange={e => updateField('github', e.target.value)}
                    placeholder="username"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('basic')}
                  className="px-6 py-2 rounded-lg bg-hedera-card border border-hedera-border text-sm text-gray-400 hover:text-white hover:border-hedera-green/30 transition-colors"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('privacy')}
                  className="px-6 py-2 rounded-lg bg-hedera-card border border-hedera-border text-sm text-white hover:border-hedera-green/30 transition-colors"
                >
                  Next: Privacy Policy &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Privacy Policy */}
          {activeSection === 'privacy' && (
            <div className="space-y-4 animate-slide-up">
              <div className="bg-hedera-card border border-hedera-border rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-hedera-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-white">HCS-19 Privacy Definition</span>
                </div>
                <p className="text-xs text-gray-400">
                  Define what data your agent collects and why. This is published on-chain for transparency and regulatory compliance.
                </p>
              </div>

              <div>
                <label className={labelClass}>Data Collected (comma-separated)</label>
                <input
                  type="text"
                  value={form.data_collected}
                  onChange={e => updateField('data_collected', e.target.value)}
                  placeholder="e.g., user queries, conversation history, usage metrics"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Purpose of Data Collection</label>
                <textarea
                  value={form.data_purpose}
                  onChange={e => updateField('data_purpose', e.target.value)}
                  placeholder="Why does your agent collect this data? How is it used?"
                  rows={2}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Data Retention Period</label>
                <select
                  value={form.retention_period}
                  onChange={e => updateField('retention_period', e.target.value)}
                  className={inputClass}
                >
                  <option value="7 days">7 days</option>
                  <option value="30 days">30 days</option>
                  <option value="90 days">90 days</option>
                  <option value="1 year">1 year</option>
                  <option value="indefinite">Indefinite</option>
                </select>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('profile')}
                  className="px-6 py-2 rounded-lg bg-hedera-card border border-hedera-border text-sm text-gray-400 hover:text-white hover:border-hedera-green/30 transition-colors"
                >
                  &larr; Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.name || !form.description || !form.capabilities}
                  className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-hedera-green to-emerald-600 text-white font-medium text-sm hover:from-hedera-green/90 hover:to-emerald-600/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Registering...
                    </span>
                  ) : (
                    'Register Agent'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Result */}
        {result && (
          <div className={`mt-6 p-5 rounded-xl border animate-slide-up ${
            result.success
              ? 'bg-hedera-green/5 border-hedera-green/20'
              : 'bg-red-500/5 border-red-500/20'
          }`}>
            {result.success ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-hedera-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-hedera-green font-semibold">Agent Registered Successfully</span>
                </div>
                <div className="space-y-2 text-sm">
                  {result.uaid && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-24">UAID:</span>
                      <code className="text-white bg-hedera-dark px-2 py-0.5 rounded font-mono text-xs">{result.uaid}</code>
                    </div>
                  )}
                  {result.agentId && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-24">Agent ID:</span>
                      <code className="text-white bg-hedera-dark px-2 py-0.5 rounded font-mono text-xs">{result.agentId}</code>
                    </div>
                  )}
                  {result.topicIds && (
                    <>
                      {result.topicIds.inbound && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 w-24">Inbound:</span>
                          <code className="text-white bg-hedera-dark px-2 py-0.5 rounded font-mono text-xs">{result.topicIds.inbound}</code>
                        </div>
                      )}
                      {result.topicIds.outbound && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 w-24">Outbound:</span>
                          <code className="text-white bg-hedera-dark px-2 py-0.5 rounded font-mono text-xs">{result.topicIds.outbound}</code>
                        </div>
                      )}
                      {result.topicIds.profile && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 w-24">Profile:</span>
                          <code className="text-white bg-hedera-dark px-2 py-0.5 rounded font-mono text-xs">{result.topicIds.profile}</code>
                        </div>
                      )}
                    </>
                  )}
                  {result.method && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-24">Method:</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-hedera-purple/10 border border-hedera-purple/20 text-hedera-purple">
                        {result.method}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-400 font-semibold">Registration Failed</span>
                </div>
                <p className="text-sm text-gray-400">{result.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Info footer */}
        <div className="mt-12 bg-hedera-card border border-hedera-border rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-3">About Agent Registration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400">
            <div>
              <h4 className="text-hedera-green font-medium mb-1">Registry Broker</h4>
              <p>Agents are registered with the HOL Registry Broker for cross-protocol discovery on Hedera.</p>
            </div>
            <div>
              <h4 className="text-hedera-green font-medium mb-1">HCS-11 Profile</h4>
              <p>Your agent gets an on-chain profile with display name, capabilities, and social links.</p>
            </div>
            <div>
              <h4 className="text-hedera-green font-medium mb-1">Universal Agent ID</h4>
              <p>Receive a UAID for unique identification across the Hedera agent ecosystem.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
