import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEventStore } from '../../stores/eventStore'
import { useGameStore } from '../../stores/gameStore'
import EventCard from '../../components/EventCard'
import { UserAvatarMenu } from '../../components'

export default function GamePage() {
  const navigate = useNavigate()
  const { activeEvents, currentEvent, setCurrentEvent, makeDecision, isLoading } = useEventStore()
  const currentDay = useGameStore((s) => s.currentDay)
  const [showEventModal, setShowEventModal] = useState(false)

  // 选择查看的事件
  const handleEventSelect = (eventId: string) => {
    const event = activeEvents.find((e) => e.id === eventId)
    if (event) {
      setCurrentEvent(event)
      setShowEventModal(true)
    }
  }

  // 处理决策
  const handleDecision = async (eventId: string, choiceIndex: number) => {
    const result = await makeDecision(eventId, choiceIndex)
    return result
  }

  // 关闭事件详情
  const handleClose = () => {
    setShowEventModal(false)
    setCurrentEvent(null)
  }

  if (isLoading && activeEvents.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">加载事件...</p>
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
              ↩ 返回
            </button>
            <div>
              <h1 className="text-xl font-bold text-[var(--accent-gold)] font-display">游戏决策</h1>
              <p className="text-[var(--text-secondary)] text-sm">第{currentDay}日 · 事件待处理</p>
            </div>
          </div>
          <UserAvatarMenu />
        </div>
      </header>

      {/* 事件列表 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-[var(--text-secondary)] mb-4 font-display">
            待处理事件 ({activeEvents.length})
          </h2>
        </div>

        {/* 事件卡片列表 */}
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
                    <span className="text-xs text-[var(--text-muted)]">第{event.triggeredAt}日</span>
                  </div>
                </div>
                <div className="text-[var(--accent-gold)]">▶</div>
              </div>
            </button>
          ))}
        </div>

        {/* 无事件提示 */}
        {activeEvents.length === 0 && (
          <div className="text-center py-12 card-modern-alt">
            <p className="text-[var(--text-secondary)]">当前没有待处理事件</p>
            <p className="text-sm text-[var(--text-muted)] mt-2">请继续阅读小说章节</p>
          </div>
        )}
      </main>

      {/* 事件详情弹窗 */}
      {showEventModal && currentEvent && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <EventCard event={currentEvent} onDecision={handleDecision} onClose={handleClose} />
        </div>
      )}
    </div>
  )
}