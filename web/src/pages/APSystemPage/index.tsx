import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { actionApi } from '../../services'
import { usePlayerStore, type SkillId } from '../../stores/playerStore'
import { UserAvatarMenu } from '../../components'

// 行动分类颜色
const categoryColors: Record<string, string> = {
  growth: 'border-l-[var(--accent-purple)]',
  resource: 'border-l-[var(--accent-gold)]',
  social: 'border-l-[var(--accent-green)]',
  event: 'border-l-[var(--accent-red)]',
}

const categoryLabels: Record<string, string> = {
  growth: '成长',
  resource: '资源',
  social: '社交',
  event: '事件',
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
function APStatusBar({ status, playerLevel }: { status: APStatus | null; playerLevel: number }) {
  if (!status) return null

  const calculatedMax = getMaxAP(playerLevel)
  const percentage = (status.current / Math.max(status.max, calculatedMax)) * 100

  return (
    <div className="card-modern mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-[var(--text-secondary)] font-display">【行动点数 AP】</h3>
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
        <span>已消耗: {status.consumed}</span>
        <span>可用: {status.current}</span>
        {status.resetTime && <span>重置: {status.resetTime}</span>}
      </div>
    </div>
  )
}

// 行动卡片
function ActionCard({ action, onExecute, isExecuting, availableAP }: {
  action: ActionData
  onExecute: (type: string, targetId?: string, parameters?: Record<string, unknown>) => void
  isExecuting: boolean
  availableAP: number
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
                {categoryLabels[category]}
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
            <p className="text-xs text-[var(--text-muted)] mt-1">执行中...</p>
          )}
        </div>
      </div>
    </div>
  )
}

// 执行结果弹窗
function ExecuteResultModal({ result, onClose }: { result: { success: boolean; message: string; rewards?: Record<string, unknown> } | null; onClose: () => void }) {
  if (!result) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-modern max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <span className="text-4xl block mb-3">
            {result.success ? '✅' : '❌'}
          </span>
          <h3 className="text-lg font-bold font-display mb-2">
            {result.success ? '【行动完成】' : '【执行失败】'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-4">{result.message}</p>

          {/* 奖励展示 */}
          {result.success && result.rewards && Object.keys(result.rewards).length > 0 && (
            <div className="bg-[var(--bg-secondary)] rounded-lg p-3 mb-4">
              <p className="text-xs text-[var(--text-muted)] mb-2">获得奖励</p>
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
            关闭
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
        message: data.message || '行动执行成功',
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
        message: error.message || '执行失败，请重试',
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
        <p className="text-[var(--text-secondary)]">加载行动数据...</p>
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
              ↩ 返回
            </button>
            <h1 className="text-lg font-bold text-[var(--text-primary)] font-display">行动系统</h1>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      <main className="container-modern py-6">
        {/* AP状态 */}
        <APStatusBar status={apStatus} playerLevel={playerLevel} />

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
            可用行动
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-[var(--accent-purple)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
            }`}
          >
            历史记录
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
                全部
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
                  {categoryIcons[key]} {label}
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
                  />
                ))}
              </div>
            ) : (
              <div className="card-modern-alt text-center py-8">
                <p className="text-[var(--text-secondary)]">暂无可用行动</p>
                <p className="text-sm text-[var(--text-muted)] mt-2">等待每日刷新或处理事件</p>
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
            <div className="card-modern-alt text-center py-8">
              <p className="text-[var(--text-secondary)]">暂无行动历史</p>
            </div>
          )
        )}
      </main>

      {/* 执行结果弹窗 */}
      <ExecuteResultModal result={executeResult} onClose={() => setExecuteResult(null)} />
    </div>
  )
}
