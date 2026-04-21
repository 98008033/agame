import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { npcDialogApi } from '../../services'
import { UserAvatarMenu } from '../../components'

// 关系等级显示
const relationshipLevels: Record<string, { color: string }> = {
  stranger: { color: 'var(--text-muted)' },
  acquaintance: { color: 'var(--text-secondary)' },
  friend: { color: 'var(--accent-green)' },
  close_friend: { color: 'var(--accent-blue)' },
  trusted: { color: 'var(--accent-purple)' },
  rival: { color: 'var(--accent-red)' },
  enemy: { color: 'var(--status-danger)' },
}

// 阵营信息
const factionInfo: Record<string, { icon: string; color: string }> = {
  canglong: { icon: '🐉', color: 'var(--faction-canglong)' },
  shuanglang: { icon: '🐺', color: 'var(--faction-shuanglang)' },
  jinque: { icon: '🌸', color: 'var(--faction-jinque)' },
  border: { icon: '🏘️', color: 'var(--faction-border)' },
}

interface Message {
  id: string
  sender: 'player' | 'npc'
  content: string
  timestamp: string
}

interface NPC {
  id: string
  name: string
  faction?: string
  role?: string
  personality?: string
  relationship?: { level: string; value: number }
}

export default function DialogPage() {
  const { t } = useTranslation()
  const { npcId } = useParams<{ npcId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isInDialog, setIsInDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取可用NPC列表
  const { data: availableNPCs, isLoading: loadingNPCs } = useQuery({
    queryKey: ['npc-dialog-available'],
    queryFn: async () => {
      const response = await npcDialogApi.getAvailable()
      if (response.data.success) return response.data.data.npcs || []
      return []
    },
    enabled: !npcId,
  })

  // 获取当前NPC信息
  const { data: npcInfo, isLoading: loadingNPCInfo } = useQuery({
    queryKey: ['npc-dialog-info', npcId],
    queryFn: async () => {
      const response = await npcDialogApi.getNPCInfo(npcId!)
      if (response.data.success) return response.data.data
      return null
    },
    enabled: !!npcId,
  })

  // 获取对话历史
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ['npc-dialog-history', npcId],
    queryFn: async () => {
      const response = await npcDialogApi.getHistory(npcId!, 50)
      if (response.data.success) return response.data.data.messages || []
      return []
    },
    enabled: !!npcId,
  })

  // 开始对话
  const startDialogMutation = useMutation({
    mutationFn: () => npcDialogApi.startDialog(npcId!),
    onSuccess: (response) => {
      if (response.data.success) {
        setIsInDialog(true)
        setMessages([])
        setError(null)
      }
    },
    onError: () => {
      setError(t('dialog.cannotStart'))
    },
  })

  // 发送消息
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) => npcDialogApi.sendMessage(npcId!, message),
    onSuccess: (response) => {
      if (response.data.success) {
        const data = response.data.data
        setMessages((prev) => [
          ...prev,
          { id: `p-${Date.now()}`, sender: 'player', content: data.playerMessage || inputValue, timestamp: new Date().toISOString() },
          { id: `n-${Date.now()}`, sender: 'npc', content: data.npcReply || '...', timestamp: new Date().toISOString() },
        ])
        setInputValue('')
        queryClient.invalidateQueries({ queryKey: ['npc-dialog-history', npcId] })
      }
    },
    onError: () => {
      setError(t('dialog.sendFailed'))
    },
  })

  // 结束对话
  const endDialogMutation = useMutation({
    mutationFn: () => npcDialogApi.endDialog(npcId!),
    onSuccess: () => {
      setIsInDialog(false)
      queryClient.invalidateQueries({ queryKey: ['npc-dialog-history', npcId] })
    },
  })

  // 加载历史消息
  useEffect(() => {
    if (history && history.length > 0 && messages.length === 0) {
      setMessages(history.map((m: Record<string, unknown>) => ({
        id: String(m.id || Math.random()),
        sender: (m.sender as 'player' | 'npc') || 'npc',
        content: String(m.content || ''),
        timestamp: String(m.timestamp || ''),
      })))
    }
  }, [history, messages.length])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 开始对话
  const handleStartDialog = useCallback(() => {
    if (npcId) {
      startDialogMutation.mutate()
    }
  }, [npcId, startDialogMutation])

  // 发送消息
  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed || sendMessageMutation.isPending) return
    sendMessageMutation.mutate(trimmed)
  }, [inputValue, sendMessageMutation])

  // 键盘回车发送
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // 选择NPC
  const handleSelectNPC = useCallback((id: string) => {
    navigate(`/dialog/${id}`)
  }, [navigate])

  // 结束对话
  const handleEndDialog = useCallback(() => {
    if (npcId) {
      endDialogMutation.mutate()
    }
  }, [npcId, endDialogMutation])

  // 返回NPC列表
  const handleBack = useCallback(() => {
    if (isInDialog) {
      handleEndDialog()
    }
    navigate('/dialog')
  }, [isInDialog, handleEndDialog, navigate])

  // ========== NPC选择视图 ==========
  if (!npcId) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <header className="header-modern">
          <div className="container-modern flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/dashboard')} className="btn-modern text-sm">
                ↩ {t('common.back')}
              </button>
              <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">{t('dialog.title')}</h1>
            </div>
            <UserAvatarMenu />
          </div>
        </header>

        <main className="container-modern py-6">
          <p className="text-[var(--text-secondary)] mb-4">{t('dialog.selectNpcHint')}</p>

          {loadingNPCs ? (
            <div className="loading-state">{t('common.loadingNpcList')}</div>
          ) : !availableNPCs || availableNPCs.length === 0 ? (
            <div className="empty-state card-modern-alt">
              <span className="empty-state-icon">👤</span>
              <p className="empty-state-title">{t('dialog.noNpcAvailable')}</p>
              <p className="text-sm">{t('dialog.noNpcHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableNPCs.map((npc: NPC) => {
                const faction = npc.faction ? factionInfo[npc.faction] : null
                const rel = npc.relationship
                const relInfo = rel ? relationshipLevels[rel.level] : null

                return (
                  <button
                    key={npc.id}
                    onClick={() => handleSelectNPC(npc.id)}
                    className="card-modern w-full text-left hover:scale-[1.01] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-[var(--text-primary)] font-display">{npc.name}</h3>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {faction && <span style={{ color: faction.color }}>{faction.icon} {t(`factions.${npc.faction}`)}</span>}
                          {npc.role && <span className="ml-2 text-[var(--text-muted)]">· {npc.role}</span>}
                        </p>
                      </div>
                      {relInfo && (
                        <span
                          className="tag-modern text-xs px-2 py-1"
                          style={{ color: relInfo.color }}
                        >
                          {t(`relationships.${rel.level}`)}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </main>
      </div>
    )
  }

  // ========== 对话视图 ==========
  const faction = npcInfo?.faction ? factionInfo[npcInfo.faction] : null
  const rel = npcInfo?.relationship
  const relInfo = rel ? relationshipLevels[rel.level] : null

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Header */}
      <header className="header-modern">
        <div className="container-modern flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={handleBack} className="btn-modern text-sm">
              ↩ {t('common.back')}
            </button>
            {loadingNPCInfo ? (
              <span className="text-[var(--text-muted)] animate-pulse">{t('common.loading')}</span>
            ) : (
              <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">
                {npcInfo?.name || npcId}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isInDialog && (
              <button
                onClick={handleEndDialog}
                className="btn-modern text-sm"
                style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
              >
                {t('dialog.endDialog')}
              </button>
            )}
            <UserAvatarMenu />
          </div>
        </div>
      </header>

      {/* NPC Info Card */}
      {npcInfo && (
        <div className="container-modern pt-4">
          <div className="card-modern">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] font-display">{npcInfo.name}</h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {faction && <span style={{ color: faction.color }}>{faction.icon} {t(`factions.${npcInfo.faction}`)}</span>}
                  {npcInfo.role && <span className="ml-2 text-[var(--text-muted)]">· {npcInfo.role}</span>}
                </p>
              </div>
              {relInfo && (
                <div className="text-right">
                  <span className="text-sm font-medium" style={{ color: relInfo.color }}>
                    {t(`relationships.${rel.level}`)}
                  </span>
                  {rel && (
                    <div className="progress-modern mt-1" style={{ width: '80px' }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(Math.max(rel.value, 0), 100)}%`,
                          backgroundColor: relInfo.color,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            {npcInfo.personality && (
              <p className="text-sm text-[var(--text-muted)] mt-2 italic">
                「{npcInfo.personality}」
              </p>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <main className="flex-1 container-modern py-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {loadingHistory ? (
          <div className="loading-state">{t('common.loadingHistory')}</div>
        ) : !isInDialog && messages.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">💬</span>
            <p className="empty-state-title">{t('dialog.noDialogYet')}</p>
            <button
              onClick={handleStartDialog}
              className="btn-modern btn-primary"
            >
              {t('dialog.startDialog')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${
                    msg.sender === 'player'
                      ? 'bg-[var(--accent-blue)] text-white rounded-br-sm'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-sm border border-[rgba(255,255,255,0.05)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.timestamp && (
                    <p className={`text-xs mt-1 ${msg.sender === 'player' ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {sendMessageMutation.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] px-4 py-2 rounded-lg text-sm bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded-bl-sm border border-[rgba(255,255,255,0.05)]">
                  <span className="animate-pulse">{t('common.thinking')}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div className="mt-3 px-3 py-2 rounded-lg text-sm text-[var(--accent-red)] bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30">
            {error}
          </div>
        )}
      </main>

      {/* Message Input */}
      <div className="container-modern pb-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isInDialog ? t('dialog.inputPlaceholder') : t('dialog.inputDisabledHint')}
            disabled={!isInDialog || sendMessageMutation.isPending}
            className="input-modern flex-1"
          />
          <button
            onClick={handleSend}
            disabled={!isInDialog || !inputValue.trim() || sendMessageMutation.isPending}
            className="btn-modern btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMessageMutation.isPending ? '...' : t('common.send')}
          </button>
        </div>
      </div>
    </div>
  )
}
