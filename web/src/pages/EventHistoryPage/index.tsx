import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { playerApi, eventsApi } from '../../services'

type EventStatus = 'all' | 'pending' | 'completed' | 'expired'

interface DecisionRecord {
  id: string
  eventTitle: string
  eventType: string
  eventCategory: string
  choiceLabel: string
  madeAt: string
  gameDay: number
  consequences: { narrativeFeedback: string }
  context: Record<string, unknown>
}

interface EventRecord {
  id: string
  title: string
  type: string
  category: string
  status: string
  createdAt: string
  gameDay?: number
}

export default function EventHistoryPage() {
  const [activeTab, setActiveTab] = useState<'decisions' | 'events'>('decisions')
  const [eventStatusFilter, setEventStatusFilter] = useState<EventStatus>('all')
  const [page, setPage] = useState(0)
  const limit = 15

  // Fetch decision history
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['player-history', page, limit],
    queryFn: () => playerApi.getHistory(limit, page * limit),
    select: (res) => res.data.data as {
      decisions: DecisionRecord[]
      total: number
      statistics: { totalDecisions: number }
    },
  })

  // Fetch event history
  const { data: eventData, isLoading: loadingEvents } = useQuery({
    queryKey: ['player-events', eventStatusFilter, page, limit],
    queryFn: () => playerApi.getEvents(eventStatusFilter === 'all' ? 'all' : eventStatusFilter, limit, page * limit),
    select: (res) => res.data.data as {
      events: EventRecord[]
      total: number
      statistics: { pending: number; completed: number; expired: number }
    },
  })

  const decisions = historyData?.decisions ?? []
  const events = eventData?.events ?? []
  const totalItems = activeTab === 'decisions'
    ? (historyData?.total ?? 0)
    : (eventData?.total ?? 0)
  const totalPages = Math.ceil(totalItems / limit)

  // Category display mapping
  const categoryLabels: Record<string, string> = {
    daily_life: '日常',
    political_decision: '政治',
    personal_event: '个人',
    faction_conflict: '阵营冲突',
    moral_dilemma: '道德困境',
    survival: '生存',
    exploration: '探索',
  }

  const typeLabels: Record<string, string> = {
    resource_crisis: '资源危机',
    faction_pressure: '阵营压力',
    npc_interaction: 'NPC互动',
    world_event: '世界事件',
    personal_growth: '个人成长',
  }

  const statusLabels: Record<string, string> = {
    pending: '待处理',
    completed: '已完成',
    expired: '已过期',
  }

  const statusColors: Record<string, string> = {
    pending: 'text-[var(--accent-gold)]',
    completed: 'text-[var(--accent-green)]',
    expired: 'text-[var(--text-muted)]',
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-[var(--pixel-bg-dark)] text-[var(--pixel-text-light)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--pixel-bg-dark)] border-b border-[var(--pixel-bg-mid)] px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold font-display text-[var(--accent-gold)]">事件历史</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            追踪你的决策轨迹与事件影响
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTab('decisions'); setPage(0) }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === 'decisions'
                ? 'bg-[var(--accent-gold)] text-[var(--pixel-bg-dark)]'
                : 'bg-[var(--pixel-bg-mid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            决策历史 ({historyData?.statistics?.totalDecisions ?? 0})
          </button>
          <button
            onClick={() => { setActiveTab('events'); setPage(0) }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === 'events'
                ? 'bg-[var(--accent-gold)] text-[var(--pixel-bg-dark)]'
                : 'bg-[var(--pixel-bg-mid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            事件列表 ({eventData?.total ?? 0})
          </button>
        </div>
      </div>

      {/* Event status filter */}
      {activeTab === 'events' && (
        <div className="max-w-4xl mx-auto px-4 mt-3 flex gap-2 flex-wrap">
          {(['all', 'pending', 'completed', 'expired'] as EventStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => { setEventStatusFilter(s); setPage(0) }}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                eventStatusFilter === s
                  ? 'bg-[var(--accent-blue)] text-white'
                  : 'bg-[var(--pixel-bg-mid)] text-[var(--text-secondary)]'
              }`}
            >
              {s === 'all' ? '全部' : statusLabels[s]}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'decisions' && (
          loadingHistory ? (
            <div className="flex justify-center py-20">
              <span className="text-[var(--text-muted)]">加载中...</span>
            </div>
          ) : decisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-4xl mb-4">📜</span>
              <p className="text-[var(--text-muted)]">暂无决策记录</p>
              <p className="text-xs text-[var(--text-muted)] mt-2">做出第一个选择后，这里会显示你的决策历史</p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map((d) => (
                <div key={d.id} className="card-modern p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--text-primary)] font-display">
                        {d.eventTitle || '未命名事件'}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--pixel-bg-mid)] text-[var(--text-secondary)]">
                          {categoryLabels[d.eventCategory] ?? d.eventCategory}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--pixel-bg-mid)] text-[var(--text-secondary)]">
                          {typeLabels[d.eventType] ?? d.eventType}
                        </span>
                        <span className="text-xs text-[var(--accent-gold)]">
                          Day {d.gameDay}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[var(--text-muted)] shrink-0">
                      <div>{formatDate(d.madeAt)}</div>
                    </div>
                  </div>

                  {/* Choice made */}
                  <div className="mt-3 pl-3 border-l-2 border-[var(--accent-gold)]">
                    <p className="text-sm text-[var(--text-secondary)]">
                      你的选择: <span className="text-[var(--text-primary)] font-medium">{d.choiceLabel}</span>
                    </p>
                  </div>

                  {/* Consequences */}
                  {d.consequences?.narrativeFeedback && (
                    <p className="mt-2 text-xs text-[var(--text-muted)] italic">
                      "{d.consequences.narrativeFeedback}"
                    </p>
                  )}
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded text-sm bg-[var(--pixel-bg-mid)] disabled:opacity-30"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-[var(--text-muted)]">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded text-sm bg-[var(--pixel-bg-mid)] disabled:opacity-30"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'events' && (
          loadingEvents ? (
            <div className="flex justify-center py-20">
              <span className="text-[var(--text-muted)]">加载中...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="text-4xl mb-4">📋</span>
              <p className="text-[var(--text-muted)]">暂无事件</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((e) => (
                <div key={e.id} className="card-modern p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--text-primary)] font-display">
                        {e.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--pixel-bg-mid)] text-[var(--text-secondary)]">
                          {categoryLabels[e.category] ?? e.category}
                        </span>
                        <span className={`text-xs font-medium ${statusColors[e.status] ?? ''}`}>
                          {statusLabels[e.status] ?? e.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-[var(--text-muted)] shrink-0">
                      <div>{formatDate(e.createdAt)}</div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1 rounded text-sm bg-[var(--pixel-bg-mid)] disabled:opacity-30"
                  >
                    上一页
                  </button>
                  <span className="text-xs text-[var(--text-muted)]">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded text-sm bg-[var(--pixel-bg-mid)] disabled:opacity-30"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}
