'use client'

import { Suspense, useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: string
  mode?: 'local' | 'broker' | 'hcs10'
  fallback?: boolean
  topicId?: string
  sequenceNumber?: number
  agentCards?: AgentRecommendation[]
}

interface AgentRecommendation {
  name: string
  description: string
  trust_score?: number
  skills?: string[]
  uaid?: string
  agent_id?: string
}

const SUGGESTIONS = [
  { label: 'Discover', text: 'List all available agents', icon: '🔍' },
  { label: 'Skills', text: 'What skills are available?', icon: '⚡' },
  { label: 'Hire', text: 'How do I hire an agent?', icon: '🤝' },
  { label: 'Privacy', text: 'Tell me about privacy compliance', icon: '🔒' },
]

/** Try to extract agent names/references from response text for recommendation cards */
function extractAgentCards(text: string): AgentRecommendation[] {
  const cards: AgentRecommendation[] = []
  // Match patterns like "**AgentName** - description" or "- AgentName: description"
  const patterns = [
    /\*\*([^*]+)\*\*\s*[-–:]\s*([^\n]+)/g,
    /^\s*[-•]\s*([A-Z][A-Za-z0-9 ]+?)\s*[-–:]\s*([^\n]+)/gm,
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim()
      const desc = match[2].trim()
      if (name.length > 2 && name.length < 40 && !cards.find(c => c.name === name)) {
        cards.push({ name, description: desc })
      }
    }
  }
  return cards.slice(0, 4)
}

function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const targetUaid = searchParams.get('uaid')
  const targetName = searchParams.get('name')
  const targetAgentId = searchParams.get('agentId')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [hcs10TopicId, setHcs10TopicId] = useState<string | null>(null)
  const [chatMode, setChatMode] = useState<'local' | 'broker' | 'hcs10'>(
    targetUaid ? 'broker' : targetAgentId ? 'hcs10' : 'local'
  )
  const [brokerStatus, setBrokerStatus] = useState<{ brokerRelayAvailable: boolean } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/chat/status')
      .then(r => r.json())
      .then(data => setBrokerStatus(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (targetUaid && targetName && messages.length === 0) {
      const greetMsg: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: `Connected to **${targetName}** via Registry Broker relay.\n\nYou can now chat directly with this agent. Messages are routed through the HOL Registry Broker.`,
        timestamp: new Date().toISOString(),
        mode: 'broker',
      }
      setMessages([greetMsg])
    } else if (targetAgentId && targetName && messages.length === 0) {
      const greetMsg: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: `Connected to **${targetName}** via HCS-10 direct messaging.\n\nMessages are sent through Hedera Consensus Service topics for on-chain verifiability.`,
        timestamp: new Date().toISOString(),
        mode: 'hcs10',
      }
      setMessages([greetMsg])
    }
  }, [targetUaid, targetName, targetAgentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text || input).trim()
    if (!msg || isLoading) return

    setInput('')
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          sessionId,
          mode: chatMode,
          uaid: targetUaid || undefined,
          agentId: targetAgentId || undefined,
          topicId: hcs10TopicId || undefined,
        }),
      })
      const data = await res.json()
      if (data.sessionId) setSessionId(data.sessionId)
      if (data.topicId) setHcs10TopicId(data.topicId)

      const responseText = data.response || 'No response'
      const agentCards = extractAgentCards(responseText)

      const agentMsg: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: responseText,
        timestamp: new Date().toISOString(),
        mode: data.mode,
        fallback: data.fallback,
        topicId: data.topicId,
        sequenceNumber: data.sequenceNumber,
        agentCards: agentCards.length > 0 ? agentCards : undefined,
      }
      setMessages(prev => [...prev, agentMsg])
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'agent',
        content: 'Network error: could not reach the server.',
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [input, isLoading, sessionId, chatMode, targetUaid, targetAgentId, hcs10TopicId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setSessionId(null)
    setHcs10TopicId(null)
  }

  const formatContent = (text: string) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-hedera-card px-1 rounded text-hedera-green text-sm">$1</code>')
      .replace(/\n/g, '<br/>')
  }

  const navigateToAgent = (card: AgentRecommendation) => {
    const params = new URLSearchParams()
    if (card.uaid) params.set('uaid', card.uaid)
    if (card.agent_id) params.set('agentId', card.agent_id)
    params.set('name', card.name)
    router.push(`/marketplace`)
  }

  return (
    <main className="bg-hedera-dark text-white flex flex-col page-enter" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Status bar */}
      <div className="bg-hedera-card/50 border-b border-hedera-border px-4 sm:px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            chatMode === 'hcs10' ? 'bg-cyan-400' : chatMode === 'broker' ? 'bg-hedera-purple' : 'bg-hedera-green'
          }`} />
          <span className="text-gray-500 truncate">
            {chatMode === 'hcs10' && targetName
              ? `HCS-10 direct: ${targetName}`
              : chatMode === 'broker' && targetName
                ? `Broker relay: ${targetName}`
                : 'Marketplace assistant ready'}
          </span>
          {hcs10TopicId && chatMode === 'hcs10' && (
            <span className="text-cyan-400/60 font-mono text-[10px] hidden sm:inline">Topic: {hcs10TopicId}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setChatMode('local')}
            className={`px-2 sm:px-2.5 py-1 text-[10px] rounded-full border transition-colors ${
              chatMode === 'local'
                ? 'bg-hedera-green/10 border-hedera-green/30 text-hedera-green'
                : 'border-hedera-border text-gray-500 hover:text-gray-300'
            }`}
          >
            Local
          </button>
          <button
            onClick={() => setChatMode('hcs10')}
            className={`px-2 sm:px-2.5 py-1 text-[10px] rounded-full border transition-colors ${
              chatMode === 'hcs10'
                ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400'
                : 'border-hedera-border text-gray-500 hover:text-gray-300'
            }`}
          >
            HCS-10
          </button>
          <button
            onClick={() => setChatMode('broker')}
            disabled={!brokerStatus?.brokerRelayAvailable && !targetUaid}
            className={`px-2 sm:px-2.5 py-1 text-[10px] rounded-full border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              chatMode === 'broker'
                ? 'bg-hedera-purple/10 border-hedera-purple/30 text-hedera-purple'
                : 'border-hedera-border text-gray-500 hover:text-gray-300'
            }`}
          >
            Broker
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-xl mx-auto space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-hedera-green/20 to-hedera-purple/20 border border-hedera-border flex items-center justify-center">
              <span className="text-3xl font-bold text-hedera-green">H</span>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Agent Marketplace Chat</h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Chat with the marketplace assistant or connect directly to agents via the HOL Registry Broker relay.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
              {SUGGESTIONS.map(s => (
                <button
                  key={s.label}
                  onClick={() => sendMessage(s.text)}
                  className="text-left p-3.5 bg-hedera-card border border-hedera-border rounded-xl text-sm text-gray-400 hover:text-hedera-green hover:border-hedera-green/30 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{s.icon}</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-600 group-hover:text-hedera-green/60">{s.label}</span>
                  </div>
                  <span className="text-gray-300 group-hover:text-white transition-colors">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] sm:max-w-[80%] animate-slide-up ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-hedera-purple to-purple-700 text-white'
                : 'bg-gradient-to-br from-hedera-green to-emerald-600 text-white'
            }`}>
              {msg.role === 'user' ? 'U' : 'H'}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-hedera-purple/20 border border-hedera-purple/30 rounded-br-sm'
                  : 'bg-hedera-card border border-hedera-border rounded-bl-sm'
              }`}
                dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
              />

              {/* Agent recommendation cards */}
              {msg.agentCards && msg.agentCards.length > 0 && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {msg.agentCards.map((card, i) => (
                    <button
                      key={i}
                      onClick={() => navigateToAgent(card)}
                      className="text-left p-3 bg-hedera-card/80 border border-hedera-border rounded-lg hover:border-hedera-green/30 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-hedera-purple/30 to-hedera-green/30 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-hedera-green">{card.name.charAt(0)}</span>
                        </div>
                        <span className="text-xs font-medium text-white group-hover:text-hedera-green transition-colors truncate">{card.name}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2">{card.description}</p>
                    </button>
                  ))}
                </div>
              )}

              <div className={`flex items-center gap-2 text-[10px] text-gray-600 mt-1 px-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.mode && (
                  <span className={`px-1.5 py-0.5 rounded ${
                    msg.mode === 'hcs10' ? 'bg-cyan-400/10 text-cyan-400'
                    : msg.mode === 'broker' ? 'bg-hedera-purple/10 text-hedera-purple'
                    : 'bg-hedera-green/10 text-hedera-green'
                  }`}>
                    {msg.mode === 'hcs10' ? 'HCS-10' : msg.mode}
                  </span>
                )}
                {msg.topicId && (
                  <span className="text-cyan-400/50 font-mono hidden sm:inline">{msg.topicId}</span>
                )}
                {msg.fallback && (
                  <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">fallback</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%] animate-slide-up">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-hedera-green to-emerald-600 flex items-center justify-center text-xs font-semibold shrink-0">H</div>
            <div className="px-4 py-3 bg-hedera-card border border-hedera-border rounded-xl rounded-bl-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-hedera-green rounded-full animate-bounce-dot" />
              <span className="w-2 h-2 bg-hedera-green rounded-full animate-bounce-dot-2" />
              <span className="w-2 h-2 bg-hedera-green rounded-full animate-bounce-dot-3" />
              <span className="text-[10px] text-gray-500 ml-2">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="bg-hedera-card border-t border-hedera-border px-4 sm:px-6 py-3 sm:py-4 shrink-0">
        <div className="flex gap-2 sm:gap-3 max-w-3xl mx-auto items-end">
          <button
            onClick={clearChat}
            className="w-10 h-10 rounded-lg border border-hedera-border bg-hedera-dark text-gray-500 hover:text-red-400 hover:border-red-400/30 flex items-center justify-center transition-colors shrink-0"
            title="Clear chat"
            aria-label="Clear chat history"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={chatMode === 'hcs10' ? 'Send message via HCS-10 topic...' : chatMode === 'broker' ? 'Send message to agent via broker relay...' : 'Ask about agents, skills, hiring, or privacy...'}
            aria-label="Chat message"
            rows={1}
            className="flex-1 bg-hedera-dark border border-hedera-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-hedera-green/50 focus:ring-1 focus:ring-hedera-green/20 transition-all"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-hedera-green to-emerald-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:from-hedera-green/90 hover:to-emerald-500 transition-all shrink-0"
            title="Send message"
            aria-label="Send message"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-700 mt-2">
          Press Enter to send &middot; Shift+Enter for new line &middot; Powered by Hedera Consensus Service
        </p>
      </div>
    </main>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <main className="bg-hedera-dark text-white flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-hedera-green/20 to-hedera-purple/20 border border-hedera-border flex items-center justify-center animate-pulse">
            <span className="text-lg font-bold text-hedera-green">H</span>
          </div>
          <span className="text-gray-500 text-sm">Loading chat...</span>
        </div>
      </main>
    }>
      <ChatContent />
    </Suspense>
  )
}
