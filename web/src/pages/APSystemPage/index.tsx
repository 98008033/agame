import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { actionApi } from '../../services'
import { usePlayerStore, type SkillId } from '../../stores/playerStore'
import { UserAvatarMenu } from '../../components'
import { useTranslation } from 'react-i18next'

// 行动分类颜色
const categoryColors: Record<string, string> = {
  growth: 'border-l-[var(--accent-purple)]',
  resource: 'border-l-[var(--accent-gold)]',
  social: 'border-l-[var(--accent-green)]',
  event: 'border-l-[var(--accent-red)]',
}

const categoryLabels: Record<string, string> = {
  growth: 'action_categories.growth',
  resource: 'action_categories.resource',
  social: 'action_categories.social',
  event: 'action_categories.event',
}

const categoryIcons: Record<string, string> = {
  growth: '📈',
  resource: '💰',
  social: '🤝',
  event: '⚡',
}

// AP等级配置（每日AP = 3 + floor(level/5)）
function getMaxAP(level: number): number {
  return 3 + Math.floor(level / 5)
}

interface ActionData {
  id: string
  type: string
  category: string
  name: string
  description: string
  apCost: number
  targetId?: string
  parameters?: Record<string, unknown>
}

interface APStatus {
  current: number
  max: number
  consumed: number
  resetTime?: string
}

// AP状态卡片
function APStatusBar({ status, playerLevel, t }: { status: APStatus | null; playerLevel: number; t: (key: string) => string }) {
  if (!status) return null

  const calculatedMax = getMaxAP(playerLevel)
  const percentage = (status.current / Math.max(status.max, calculatedMax)) * 100

  return (
    <div className="card-modern mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] font-display">{t('ap_system.apTitle')}</h3>
        <span className="text-lg font-bold text-[var(--accent-purple)] font-display">
          {status.current}/{status.max}
        </span>
      </div>

      {/* AP进度条 */}
      <div className="progress-modern mb-2">
        <div
          className="progress-fill transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: percentage > 50 ? 'var(--accent-purple)' : percentage > 25 ? 'var(--accent-gold)' : 'var(--accent-red)'
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-[var(--text-muted)]">
        <span>{t('ap_system.consumed')} {status.consumed}</span>
        <span>{t('ap_system.available')} {status.current}</span>
        {status.resetTime && <span>{t('ap_system.reset')} {status.resetTime}</span>}
      </div>
    </div>
  )
}

// 行动卡片
function ActionCard({ action, onExecute, isExecuting, availableAP, t }: {
  action: ActionData
  onExecute: (type: string, targetId?: string, parameters?: Record<string, unknown>) => void
  isExecuting: boolean
  availableAP: number
  t: (key: string) => string
}) {
  const category = action.category || 'growth'
  const isDisabled = action.apCost > availableAP

  return (
    <div
      className={`card-modern border-l-4 ${categoryColors[category] || 'border-l-[var(--text-muted)]'} ${
        isDisabled ? 'opacity-50' : 'cursor-pointer hover:scale-[1.01]'
      } transition-all`}
      onClick={() => !isDisabled && onExecute(action.type, action.targetId, action.parameters)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-xl">{categoryIcons[category]}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-[var(--text-primary)] font-display">
                {action.name || action.type}
              </h4>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                category === 'growth' ? 'tag-modern' :
                category === 'resource' ? 'tag-warning' :
                category === 'social' ? 'tag-success' :
                'tag-danger'
              }`}>
                {t(categoryLabels[category])}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{action.description}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <span className={`text-sm font-bold font-display ${isDisabled ? 'text-[var(--accent-red)]' : 'text-[var(--accent-purple)]'}`}>
            -{action.apCost} AP
          </span>
          {isExecuting && (
            <p className="text-xs text-[var(--text-muted)] mt-1">{t('ap_system.executing')}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// 执行结果弹窗
function ExecuteResultModal({ result, onClose, t }: { result: { success: boolean; message: string; rewards?: Record<string, unknown> } | null; onClose: () => void; t: (key: string) => string }) {
  if (!result) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-modern max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <span className="text-4xl block mb-3">
            {result.success ? '✅' : '❌'}
          </span>
          <h3 className="text-lg font-bold font-display mb-2">
            {result.success ? t('ap_system.actionComplete') : t('ap_system.actionFailed')}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{result.message}</p>

          {/* 奖励展示 */}
          {result.success && result.rewards && Object.keys(result.rewards).length > 0 && (
            <div className="bg-[var(--bg-secondary)] rounded-lg p-3 mb-4">
              <p className="text-xs text-[var(--text-muted)] mb-2">{t('ap_system.reward')}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {Object.entries(result.rewards).map(([key, value]) => (
                  <span key={key} className="tag-modern tag-success">
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button onClick={onClose} className="btn-modern">
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

// 历史记录项
function HistoryItem({ record }: { record: { type: string; result: string; timestamp: string; rewards?: Record<string, unknown> } }) {
  const date = new Date(record.timestamp)
  const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`

  return (
    <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
      <div>
        <span className="font-medium text-sm text-[var(--text-primary)]">{record.type}</span>
        <p className="text-xs text-[var(--text-muted)] mt-1">{record.result}</p>
      </div>
      <span className="text-xs text-[var(--text-muted)]">{timeStr}</span>
    </div>
  )
}

export default function APSystemPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const player = usePlayerStore((s) => s.player)
  const playerLevel = player.level || 1

  const [activeTab, setActiveTab] = useState<'actions' | 'history'>('actions')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [executeResult, setExecuteResult] = useState<{ success: boolean; message: string; rewards?: Record<string, unknown> } | null>(null)

  // 获取AP状态
  const { data: apStatus } = useQuery({
    queryKey: ['ap-status'],
    queryFn: async () => {
      const response = await actionApi.getStatus()
      if (response.data.success) return response.data.data as APStatus
      return null
    },
    initialData: null,
  })

  // 获取可用行动列表
  const { data: actions, isLoading: actionsLoading } = useQuery({
    queryKey: ['actions-list'],
    queryFn: async () => {
      const response = await actionApi.getList()
      if (response.data.success) return response.data.data.actions as ActionData[]
      return []
    },
    initialData: [],
  })

  // 获取历史记录
  const { data: history } = useQuery({
    queryKey: ['actions-history'],
    queryFn: async () => {
      const response = await actionApi.getHistory(20, 0)
      if (response.data.success) return response.data.data.history || []
      return []
    },
    initialData: [],
  })

  // 执行行动
  const executeMutation = useMutation({
    mutationFn: async ({ actionType, targetId, parameters }: { actionType: string; targetId?: string; parameters?: Record<string, unknown> }) => {
      const response = await actionApi.execute(actionType, targetId, parameters)
      if (response.data.success) return response.data.data
      throw new Error(response.data.message || '执行失败')
    },
    onSuccess: (data) => {
      setExecuteResult({
        success: true,
        message: data.message || t('ap_system.executeSuccess'),
        rewards: data.rewards,
      })
      // 刷新AP状态和行动列表
      queryClient.invalidateQueries({ queryKey: ['ap-status'] })
      queryClient.invalidateQueries({ queryKey: ['actions-list'] })
      queryClient.invalidateQueries({ queryKey: ['actions-history'] })
    },
    onError: (error: Error) => {
      setExecuteResult({
        success: false,
        message: error.message || t('ap_system.executeFailed'),
      })
    },
  })

  const handleExecute = useCallback((actionType: string, targetId?: string, parameters?: Record<string, unknown>) => {
    executeMutation.mutate({ actionType, targetId, parameters })
  }, [executeMutation])

  // 过滤行动
  const filteredActions = categoryFilter === 'all'
    ? actions
    : actions.filter((a) => a.category === categoryFilter)

  const currentAP = apStatus?.current ?? getMaxAP(playerLevel)

  // 如果没有行动数据且正在加载
  if (actionsLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="container-modern flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/dashboard')} className="btn-modern text-sm">
              ↩ {t('common.back')}
            </button>
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">{t('ap_system.title')}</h1>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      <main className="container-modern py-6">
        {/* AP状态 */}
        <APStatusBar status={apStatus} playerLevel={playerLevel} t={t} />

        {/* Tab切换 */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'actions'
                ? 'bg-[var(--accent-purple)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            {t('ap_system.availableActions')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-[var(--accent-purple)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            {t('ap_system.history')}
          </button>
        </div>

        {activeTab === 'actions' ? (
          <>
            {/* 分类过滤 */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-[var(--accent-purple)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                }`}
              >
                {t('common.all')}
              </button>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${
                    categoryFilter === key
                      ? 'bg-[var(--accent-purple)] text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                  }`}
                >
                  {categoryIcons[key]} {t(label)}
                </button>
              ))}
            </div>

            {/* 行动列表 */}
            {filteredActions.length > 0 ? (
              <div className="space-y-3">
                {filteredActions.map((action) => (
                  <ActionCard
                    key={action.id || action.type}
                    action={action}
                    onExecute={handleExecute}
                    isExecuting={executeMutation.isPending}
                    availableAP={currentAP}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state card-modern-alt">
                <span className="empty-state-icon">🎯</span>
                <p className="empty-state-title">{t('ap_system.noActions')}</p>
                <p className="text-sm">{t('ap_system.noActionsHint')}</p>
              </div>
            )}
          </>
        ) : (
          /* 历史记录 */
          history.length > 0 ? (
            <div className="space-y-2">
              {history.map((record: Record<string, unknown>, index: number) => (
                <HistoryItem
                  key={index}
                  record={record as { type: string; result: string; timestamp: string; rewards?: Record<string, unknown> }}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state card-modern-alt">
              <span className="empty-state-icon">📋</span>
              <p className="empty-state-title">{t('ap_system.noHistory')}</p>
            </div>
          )
        )}
      </main>

      {/* 执行结果弹窗 */}
      <ExecuteResultModal result={executeResult} onClose={() => setExecuteResult(null)} t={t} />
    </div>
  )
}
