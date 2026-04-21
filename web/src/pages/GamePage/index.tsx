import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEventStore } from '../../stores/eventStore'
import { useGameStore } from '../../stores/gameStore'
import EventCard from '../../components/EventCard'
import { UserAvatarMenu } from '../../components'

export default function GamePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { activeEvents, currentEvent, setCurrentEvent, makeDecision, isLoading } = useEventStore()
  const currentDay = useGameStore((s) => s.currentDay)
  const [showEventModal, setShowEventModal] = useState(false)

  const handleEventSelect = (eventId: string) => {
    const event = activeEvents.find((e) => e.id === eventId)
    if (event) {
      setCurrentEvent(event)
      setShowEventModal(true)
    }
  }

  const handleDecision = async (eventId: string, choiceIndex: number) => {
    const result = await makeDecision(eventId, choiceIndex)
    return result
  }

  const handleClose = () => {
    setShowEventModal(false)
    setCurrentEvent(null)
  }

  if (isLoading && activeEvents.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">{t('common.loadingEvent')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <header className="header-modern">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-modern text-sm"
            >
              ↩ {t('common.back')}
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--accent-gold)] font-display">{t('game.title')}</h1>
              <p className="text-[var(--text-secondary)] text-sm">{t('common.day', { day: currentDay })} · {t('game.subtitle')}</p>
            </div>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      {/* 事件列表 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-[var(--text-secondary)] mb-4 font-display">
            {t('game.pendingTitle', { count: activeEvents.length })}
          </h2>
        </div>

        <div className="space-y-4">
          {activeEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => handleEventSelect(event.id)}
              className="card-modern w-full text-left hover:border-[var(--accent-gold)]/50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-[var(--text-primary)] font-display">{event.title}</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{event.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {event.faction && (
                      <span className="tag-modern">{event.faction}</span>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">{t('event.dayTriggered', { day: event.triggeredAt })}</span>
                  </div>
                </div>
                <div className="text-[var(--accent-gold)]">▶</div>
              </div>
            </button>
          ))}
        </div>

        {activeEvents.length === 0 && (
          <div className="empty-state card-modern-alt">
            <span className="empty-state-icon">📭</span>
            <p className="empty-state-title">{t('game.noEvents')}</p>
            <p className="text-sm">{t('game.noEventsHint')}</p>
          </div>
        )}
      </main>

      {showEventModal && currentEvent && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <EventCard event={currentEvent} onDecision={handleDecision} onClose={handleClose} />
        </div>
      )}
    </div>
  )
}
