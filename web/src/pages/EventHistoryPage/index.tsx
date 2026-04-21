import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { playerApi, eventsApi } from '../../services'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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
    daily_life: t('event.categories.daily'),
    political_decision: t('event.categories.political'),
    personal_event: t('event.categories.personal'),
    faction_conflict: t('event.categories.faction_conflict'),
    moral_dilemma: t('event.categories.moral_dilemma'),
    survival: t('event.categories.survival'),
    exploration: t('event.categories.exploration'),
  }

  const typeLabels: Record<string, string> = {
    resource_crisis: t('event.types.resource_crisis'),
    faction_pressure: t('event.types.faction_pressure'),
    npc_interaction: t('event.types.npc_interaction'),
    world_event: t('event.types.world_event'),
    personal_growth: t('event.types.personal_growth'),
  }

  const statusLabels: Record<string, string> = {
    pending: t('common.pending'),
    completed: t('common.completed'),
    expired: t('common.expired'),
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
          <h1 className="text-xl font-bold font-display text-[var(--accent-gold)]">{t('event_history.title')}</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {t('event_history.subtitle')}
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
            {t('event_history.decisionHistory')} ({historyData?.statistics?.totalDecisions ?? 0})
          </button>
          <button
            onClick={() => { setActiveTab('events'); setPage(0) }}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activeTab === 'events'
                ? 'bg-[var(--accent-gold)] text-[var(--pixel-bg-dark)]'
                : 'bg-[var(--pixel-bg-mid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('event_history.eventList')} ({eventData?.total ?? 0})
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
              {s === 'all' ? t('common.all') : statusLabels[s]}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'decisions' && (
          loadingHistory ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : decisions.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📜</span>
              <p className="empty-state-title">{t('event_history.noRecords')}</p>
              <p className="text-sm">{t('event_history.noRecordsHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.map((d) => (
                <div key={d.id} className="card-modern p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--text-primary)] font-display">
                        {d.eventTitle || t('event_history.unnamedEvent')}
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
                      {t('event_history.yourChoice')} <span className="text-[var(--text-primary)] font-medium">{d.choiceLabel}</span>
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
                    {t('common.prevPage')}
                  </button>
                  <span className="text-xs text-[var(--text-muted)]">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded text-sm bg-[var(--pixel-bg-mid)] disabled:opacity-30"
                  >
                    {t('common.nextPage')}
                  </button>
                </div>
              )}
            </div>
          )
        )}

        {activeTab === 'events' && (
          loadingEvents ? (
            <div className="loading-state">{t('common.loading')}</div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📋</span>
              <p className="empty-state-title">{t('event_history.noEvents')}</p>
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
                    {t('common.prevPage')}
                  </button>
                  <span className="text-xs text-[var(--text-muted)]">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1 rounded text-sm bg-[var(--pixel-bg-mid)] disabled:opacity-30"
                  >
                    {t('common.nextPage')}
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
