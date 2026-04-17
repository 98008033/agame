import { useState } from 'react'
import { useEventStore } from '../../stores/eventStore'
import EventCard from '../../components/EventCard'

export default function GamePage() {
  const { activeEvents, currentEvent, setCurrentEvent, makeDecision } = useEventStore()
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 游戏标题 */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-xl font-bold text-gray-800">游戏决策</h1>
          <p className="text-sm text-gray-500">第1日 · 事件待处理</p>
        </div>
      </header>

      {/* 事件列表 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-700 mb-4">
            待处理事件 ({activeEvents.length})
          </h2>
        </div>

        {/* 事件卡片列表 */}
        <div className="space-y-4">
          {activeEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => handleEventSelect(event.id)}
              className="w-full p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-800">{event.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {event.faction && (
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded">{event.faction}</span>
                    )}
                    <span className="text-xs text-gray-400">第{event.triggeredAt}日</span>
                  </div>
                </div>
                <div className="text-blue-500">▶</div>
              </div>
            </button>
          ))}
        </div>

        {/* 无事件提示 */}
        {activeEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">当前没有待处理事件</p>
            <p className="text-sm text-gray-400 mt-2">请继续阅读小说章节</p>
          </div>
        )}
      </main>

      {/* 事件详情弹窗 */}
      {showEventModal && currentEvent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <EventCard event={currentEvent} onDecision={handleDecision} onClose={handleClose} />
        </div>
      )}
    </div>
  )
}
