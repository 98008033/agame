import { useState, useRef, useEffect } from 'react'
import { npcApi } from '../../services'

export interface DialogMessage {
  id: string
  role: 'player' | 'npc' | 'system'
  content: string
  timestamp: string
}

export interface NPCInfo {
  id: string
  name: string
  faction?: string
  role?: string
  description?: string
  avatar?: string
}

interface NPCDialogProps {
  npc: NPCInfo
  onClose: () => void
}

const avatars = ['👨‍🌾', '👩‍🔧', '👴', '👩‍🎓', '🧑‍⚔️', '👨‍💼', '👩‍🏫', '🧙']

export default function NPCDialog({ npc, onClose }: NPCDialogProps) {
  const [messages, setMessages] = useState<DialogMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isFirstLoad = useRef(true)

  const avatar = npc.avatar || avatars[Math.abs(npc.name.charCodeAt(0)) % avatars.length]

  // 加载对话历史
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false
      loadHistory()
    }
  }, [npc.id])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadHistory = async () => {
    try {
      const response = await npcApi.getDetail(npc.id)
      if (response.data.success) {
        const data = response.data.data
        // 尝试从详情中获取对话历史
        if (data.dialogHistory && Array.isArray(data.dialogHistory)) {
          const historyMessages: DialogMessage[] = data.dialogHistory.map((msg: Record<string, unknown>, i: number) => ({
            id: `history_${i}`,
            role: (msg.role as 'player' | 'npc' | 'system') || 'npc',
            content: String(msg.content || msg.message || ''),
            timestamp: String(msg.timestamp || new Date().toISOString()),
          }))
          setMessages(historyMessages)
        } else {
          // 无历史时添加开场白
          setMessages([{
            id: 'greeting',
            role: 'npc',
            content: `${npc.name}向你点了点头，等待你的话语。`,
            timestamp: new Date().toISOString(),
          }])
        }
      }
    } catch (error) {
      console.error('Failed to load dialog history:', error)
      setMessages([{
        id: 'greeting',
        role: 'npc',
        content: `${npc.name}向你点了点头，等待你的话语。`,
        timestamp: new Date().toISOString(),
      }])
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: DialogMessage = {
      id: `user_${Date.now()}`,
      role: 'player',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    const userInput = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      const response = await npcApi.interact(npc.id, 'dialogue', userInput)
      if (response.data.success) {
        const data = response.data.data
        const npcReply: DialogMessage = {
          id: `npc_${Date.now()}`,
          role: 'npc',
          content: data.message || data.response || `${npc.name}沉默了一会儿，没有回应。`,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, npcReply])

        // 如果有关系变化，显示系统消息
        if (data.relationshipChange) {
          const sysMsg: DialogMessage = {
            id: `sys_${Date.now()}`,
            role: 'system',
            content: `与${npc.name}的关系发生了变化: ${data.relationshipChange}`,
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, sysMsg])
        }
      } else {
        throw new Error(response.data.message || '对话失败')
      }
    } catch (error) {
      const errorMsg: DialogMessage = {
        id: `err_${Date.now()}`,
        role: 'system',
        content: error instanceof Error ? error.message : '对话失败，请重试',
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* NPC信息卡片 */}
      <div className="card-modern flex-shrink-0 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-2xl flex-shrink-0">
            {avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[var(--text-primary)] font-display">{npc.name}</h3>
            <p className="text-xs text-[var(--text-muted)]">
              {npc.faction && `${npc.faction} · `}{npc.role || '未知身份'}
            </p>
            {npc.description && (
              <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">{npc.description}</p>
            )}
          </div>
          <button onClick={onClose} className="btn-modern text-sm flex-shrink-0">
            ✕ 关闭
          </button>
        </div>
      </div>

      {/* 对话历史 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-0" style={{ maxHeight: '50vh' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'player' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                msg.role === 'player'
                  ? 'bg-[var(--accent-purple)]/30 text-[var(--text-primary)] rounded-br-none'
                  : msg.role === 'system'
                    ? 'bg-[var(--bg-elevated)]/50 text-[var(--text-muted)] text-xs rounded-md'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-none'
              }`}
            >
              {msg.role === 'npc' && (
                <span className="text-xs text-[var(--accent-gold)] font-medium block mb-1">
                  {npc.name}
                </span>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <span className="text-[10px] text-[var(--text-muted)] block mt-1 text-right">
                {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-secondary)] p-3 rounded-lg rounded-bl-none">
              <p className="text-sm text-[var(--text-muted)] animate-pulse">思考中...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <div className="flex-shrink-0 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入你想说的话..."
          className="input-modern flex-1"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="btn-modern disabled:opacity-50"
          style={{ borderColor: 'var(--accent-purple)' }}
        >
          发送
        </button>
      </div>
    </div>
  )
}
